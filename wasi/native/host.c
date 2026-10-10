// The host of the wasm2c-translated DuckDB: WASI preview1 over POSIX, with the sandbox's whole reach decided
// here. SANDBOX_WASM64 selects the 64-bit module: the same calls with 64-bit pointers and sizes (the
// "DuckDB-sandbox ABI", wasi-libc built for wasm64 with the 32-bit layout checks dropped). The module sees standard streams, the directories preopened on the command line (--dir host[::guest],
// read-only unless marked :rw), a clock and a random source. Nothing else exists.
//
// Paths are resolved relative to the preopened directory with openat; absolute paths and ".." components are
// refused. Symbolic links inside a preopened directory are followed by the host OS, so a directory handed to the
// sandbox should not contain links pointing outside of it (wasmtime's cap-std resolves this fully; this host
// does not yet).
#define _GNU_SOURCE
#include <dirent.h>
#include <sched.h>
#include <errno.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/uio.h>
#include <time.h>
#include <unistd.h>

#include "wasm-rt.h"
#include "wasm-rt-impl.h"
#include "duckdb.h"

#ifdef SANDBOX_THREADS
#include <pthread.h>
#include <stdatomic.h>
#endif

// Pointers and sizes as the module passes them
#ifdef SANDBOX_WASM64
typedef u64 wptr;
#define PTR_SIZE 8
#else
typedef u32 wptr;
#define PTR_SIZE 4
#endif

// ---------------------------------------------------------------------------------------------------------------
// WASI preview1 constants
enum {
    WASI_ESUCCESS = 0, WASI_E2BIG = 1, WASI_EACCES = 2, WASI_EAGAIN = 6, WASI_EBADF = 8, WASI_EBUSY = 10,
    WASI_EEXIST = 20, WASI_EFBIG = 22, WASI_EINVAL = 28, WASI_EIO = 29, WASI_EISDIR = 31, WASI_ELOOP = 32,
    WASI_EMFILE = 33, WASI_ENAMETOOLONG = 37, WASI_ENFILE = 41, WASI_ENOENT = 44, WASI_ENOMEM = 48,
    WASI_ENOSPC = 51, WASI_ENOSYS = 52, WASI_ENOTDIR = 54, WASI_ENOTEMPTY = 55, WASI_ENOTSUP = 58,
    WASI_EOVERFLOW = 61, WASI_EPERM = 63, WASI_EROFS = 69, WASI_ESPIPE = 70, WASI_ENOTCAPABLE = 76,
};
enum { WASI_FILETYPE_UNKNOWN = 0, WASI_FILETYPE_CHARACTER_DEVICE = 2, WASI_FILETYPE_DIRECTORY = 3,
       WASI_FILETYPE_REGULAR_FILE = 4, WASI_FILETYPE_SYMBOLIC_LINK = 7 };
enum { WASI_OFLAGS_CREAT = 1, WASI_OFLAGS_DIRECTORY = 2, WASI_OFLAGS_EXCL = 4, WASI_OFLAGS_TRUNC = 8 };
enum { WASI_FDFLAGS_APPEND = 1, WASI_FDFLAGS_DSYNC = 2, WASI_FDFLAGS_NONBLOCK = 4, WASI_FDFLAGS_RSYNC = 8,
       WASI_FDFLAGS_SYNC = 16 };
enum { WASI_LOOKUP_SYMLINK_FOLLOW = 1 };
static const uint64_t WASI_RIGHT_FD_READ = 1ull << 1;
static const uint64_t WASI_RIGHT_FD_WRITE = 1ull << 6;
enum { WASI_CLOCK_REALTIME = 0, WASI_CLOCK_MONOTONIC = 1 };
enum { WASI_EVENTTYPE_CLOCK = 0 };

static uint32_t WasiErrno(int err) {
    switch (err) {
        case 0: return WASI_ESUCCESS;
        case E2BIG: return WASI_E2BIG;
        case EACCES: return WASI_EACCES;
        case EAGAIN: return WASI_EAGAIN;
        case EBADF: return WASI_EBADF;
        case EBUSY: return WASI_EBUSY;
        case EEXIST: return WASI_EEXIST;
        case EFBIG: return WASI_EFBIG;
        case EINVAL: return WASI_EINVAL;
        case EIO: return WASI_EIO;
        case EISDIR: return WASI_EISDIR;
        case ELOOP: return WASI_ELOOP;
        case EMFILE: return WASI_EMFILE;
        case ENAMETOOLONG: return WASI_ENAMETOOLONG;
        case ENFILE: return WASI_ENFILE;
        case ENOENT: return WASI_ENOENT;
        case ENOMEM: return WASI_ENOMEM;
        case ENOSPC: return WASI_ENOSPC;
        case ENOSYS: return WASI_ENOSYS;
        case ENOTDIR: return WASI_ENOTDIR;
        case ENOTEMPTY: return WASI_ENOTEMPTY;
        case ENOTSUP: return WASI_ENOTSUP;
        case EOVERFLOW: return WASI_EOVERFLOW;
        case EPERM: return WASI_EPERM;
        case EROFS: return WASI_EROFS;
        case ESPIPE: return WASI_ESPIPE;
        default: return WASI_EIO;
    }
}

// ---------------------------------------------------------------------------------------------------------------
// The sandbox: its file descriptor table and arguments
#define MAX_FDS 1024

typedef struct {
    int host_fd;        // -1: free
    bool preopen;       // a directory given on the command line
    bool writable;      // writes allowed below this directory / on this file
    char *guest_path;   // the name the preopen is announced under
} FdEntry;

struct w2c_wasi__snapshot__preview1 {
    w2c_duckdb *inst;
    FdEntry fds[MAX_FDS];
    int argc;
    char **argv;
    // only what --env names: the host's own environment never leaks in
    int envc;
    char **envv;
};

static struct w2c_wasi__snapshot__preview1 sandbox;

#ifdef SANDBOX_THREADS
// The threads module imports its memory: one shared memory the host owns, the instance of every thread maps it
static wasm_rt_shared_memory_t shared_memory;
struct w2c_env { int unused; };
wasm_rt_shared_memory_t *w2c_env_memory(struct w2c_env *env) { (void)env; return &shared_memory; }
#define MEM shared_memory
#define MEM_DATA ((uint8_t *)shared_memory.data)
static pthread_mutex_t fd_lock = PTHREAD_MUTEX_INITIALIZER;
#define FD_LOCK() pthread_mutex_lock(&fd_lock)
#define FD_UNLOCK() pthread_mutex_unlock(&fd_lock)
#else
#define MEM (sandbox.inst->w2c_memory)
#define MEM_DATA (MEM.data)
#define FD_LOCK()
#define FD_UNLOCK()
#endif
static bool InBounds(uint64_t off, uint64_t len) { return off <= MEM.size && len <= MEM.size - off; }
static uint8_t *Ptr(wptr off, uint64_t len) {
    if (!InBounds(off, len)) wasm_rt_trap(WASM_RT_TRAP_OOB);
    return MEM_DATA + off;
}
static uint32_t LoadU32(wptr off) { uint32_t v; memcpy(&v, Ptr(off, 4), 4); return v; }
static void StoreU8(wptr off, uint8_t v) { *Ptr(off, 1) = v; }
static void StoreU16(wptr off, uint16_t v) { memcpy(Ptr(off, 2), &v, 2); }
static void StoreU32(wptr off, uint32_t v) { memcpy(Ptr(off, 4), &v, 4); }
static void StoreU64(wptr off, uint64_t v) { memcpy(Ptr(off, 8), &v, 8); }
// A pointer or a size_t of the module
static wptr LoadPtr(wptr off) { wptr v; memcpy(&v, Ptr(off, PTR_SIZE), PTR_SIZE); return v; }
static void StorePtr(wptr off, wptr v) { memcpy(Ptr(off, PTR_SIZE), &v, PTR_SIZE); }
#define StoreSize StorePtr

static FdEntry *Fd(uint32_t fd) {
    if (fd >= MAX_FDS || sandbox.fds[fd].host_fd < 0) return NULL;
    return &sandbox.fds[fd];
}
static int AllocFd(int host_fd, bool writable) {
    FD_LOCK();
    for (int i = 3; i < MAX_FDS; i++) {
        if (sandbox.fds[i].host_fd < 0) {
            sandbox.fds[i] = (FdEntry){host_fd, false, writable, NULL};
            FD_UNLOCK();
            return i;
        }
    }
    FD_UNLOCK();
    return -1;
}

// A guest path is relative to a preopened directory and must stay below it
static bool PathOk(const char *path) {
    if (path[0] == '/') return false;
    const char *p = path;
    while (*p) {
        const char *end = strchr(p, '/');
        size_t len = end ? (size_t)(end - p) : strlen(p);
        if (len == 2 && p[0] == '.' && p[1] == '.') return false;
        p += len;
        while (*p == '/') p++;
    }
    return true;
}
// Copies the guest path into a NUL-terminated host buffer, checking it
static uint32_t GuestPath(uint32_t ptr, uint32_t len, char *out, size_t out_size) {
    if (len + 1 > out_size) return WASI_ENAMETOOLONG;
    memcpy(out, Ptr(ptr, len), len);
    out[len] = 0;
    if (memchr(out, 0, len)) return WASI_EINVAL;
    if (!PathOk(out)) return WASI_ENOTCAPABLE;
    if (len == 0) strcpy(out, ".");
    return WASI_ESUCCESS;
}

static uint8_t FileType(mode_t mode) {
    if (S_ISREG(mode)) return WASI_FILETYPE_REGULAR_FILE;
    if (S_ISDIR(mode)) return WASI_FILETYPE_DIRECTORY;
    if (S_ISLNK(mode)) return WASI_FILETYPE_SYMBOLIC_LINK;
    if (S_ISCHR(mode)) return WASI_FILETYPE_CHARACTER_DEVICE;
    return WASI_FILETYPE_UNKNOWN;
}
static uint64_t Nanos(struct timespec ts) { return (uint64_t)ts.tv_sec * 1000000000ull + (uint64_t)ts.tv_nsec; }
static void StoreFilestat(uint32_t out, const struct stat *st) {
    StoreU64(out + 0, (uint64_t)st->st_dev);
    StoreU64(out + 8, (uint64_t)st->st_ino);
    StoreU8(out + 16, FileType(st->st_mode));
    StoreU64(out + 24, (uint64_t)st->st_nlink);
    StoreU64(out + 32, (uint64_t)st->st_size);
#ifdef __APPLE__
    StoreU64(out + 40, Nanos(st->st_atimespec));
    StoreU64(out + 48, Nanos(st->st_mtimespec));
    StoreU64(out + 56, Nanos(st->st_ctimespec));
#else
    StoreU64(out + 40, Nanos(st->st_atim));
    StoreU64(out + 48, Nanos(st->st_mtim));
    StoreU64(out + 56, Nanos(st->st_ctim));
#endif
}

// iovecs of the guest as host iovecs, bounds checked
static uint32_t Iovecs(wptr iovs, wptr iovs_len, struct iovec *out, uint32_t max) {
    if (iovs_len > max) return WASI_EINVAL;
    for (uint32_t i = 0; i < iovs_len; i++) {
        wptr buf = LoadPtr(iovs + i * 2 * PTR_SIZE), len = LoadPtr(iovs + i * 2 * PTR_SIZE + PTR_SIZE);
        out[i].iov_base = Ptr(buf, len);
        out[i].iov_len = len;
    }
    return WASI_ESUCCESS;
}
#define MAX_IOVS 128

// ---------------------------------------------------------------------------------------------------------------
// Arguments, environment, clock, random, scheduling
u32 w2c_wasi__snapshot__preview1_args_sizes_get(struct w2c_wasi__snapshot__preview1 *s, wptr count, wptr size) {
    uint32_t total = 0;
    for (int i = 0; i < s->argc; i++) total += strlen(s->argv[i]) + 1;
    StoreSize(count, (wptr)s->argc);
    StoreSize(size, total);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_args_get(struct w2c_wasi__snapshot__preview1 *s, wptr argv, wptr buf) {
    for (int i = 0; i < s->argc; i++) {
        size_t len = strlen(s->argv[i]) + 1;
        memcpy(Ptr(buf, len), s->argv[i], len);
        StorePtr(argv + i * PTR_SIZE, buf);
        buf += len;
    }
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_environ_sizes_get(struct w2c_wasi__snapshot__preview1 *s, wptr count, wptr size) {
    uint32_t total = 0;
    for (int i = 0; i < s->envc; i++) total += strlen(s->envv[i]) + 1;
    StoreSize(count, (wptr)s->envc);
    StoreSize(size, total);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_environ_get(struct w2c_wasi__snapshot__preview1 *s, wptr environ, wptr buf) {
    for (int i = 0; i < s->envc; i++) {
        size_t len = strlen(s->envv[i]) + 1;
        memcpy(Ptr(buf, len), s->envv[i], len);
        StorePtr(environ + i * PTR_SIZE, buf);
        buf += len;
    }
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_clock_time_get(struct w2c_wasi__snapshot__preview1 *s, u32 id, u64 precision, wptr out) {
    (void)s; (void)precision;
    struct timespec ts;
    clockid_t clock = id == WASI_CLOCK_REALTIME ? CLOCK_REALTIME : CLOCK_MONOTONIC;
    if (id > WASI_CLOCK_MONOTONIC || clock_gettime(clock, &ts) != 0) return WASI_EINVAL;
    StoreU64(out, Nanos(ts));
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_random_get(struct w2c_wasi__snapshot__preview1 *s, wptr buf, wptr len) {
    (void)s;
    arc4random_buf(Ptr(buf, len), len);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_sched_yield(struct w2c_wasi__snapshot__preview1 *s) {
    (void)s;
    sched_yield();
    return WASI_ESUCCESS;
}
// Only clock subscriptions (sleeping)
u32 w2c_wasi__snapshot__preview1_poll_oneoff(struct w2c_wasi__snapshot__preview1 *s, wptr in, wptr out, wptr n, wptr nevents) {
    (void)s;
    uint32_t produced = 0;
    for (uint32_t i = 0; i < n; i++) {
        uint32_t sub = in + i * 48;
        uint64_t userdata; memcpy(&userdata, Ptr(sub, 8), 8);
        uint8_t type = *Ptr(sub + 8, 1);
        if (type != WASI_EVENTTYPE_CLOCK) return WASI_ENOSYS;
        uint64_t timeout; memcpy(&timeout, Ptr(sub + 24, 8), 8);
        uint16_t flags; memcpy(&flags, Ptr(sub + 40, 2), 2);
        if (!(flags & 1)) {  // relative
            struct timespec ts = {(time_t)(timeout / 1000000000ull), (long)(timeout % 1000000000ull)};
            nanosleep(&ts, NULL);
        }
        uint32_t ev = out + produced * 32;
        StoreU64(ev, userdata);
        StoreU16(ev + 8, WASI_ESUCCESS);
        StoreU8(ev + 10, WASI_EVENTTYPE_CLOCK);
        produced++;
    }
    StoreSize(nevents, produced);
    return WASI_ESUCCESS;
}
void w2c_wasi__snapshot__preview1_proc_exit(struct w2c_wasi__snapshot__preview1 *s, u32 code) {
    (void)s;
    fflush(stdout);
    fflush(stderr);
    _exit((int)code);
}

// ---------------------------------------------------------------------------------------------------------------
// File descriptors
u32 w2c_wasi__snapshot__preview1_fd_prestat_get(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr out) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e || !e->preopen) return WASI_EBADF;
    StoreU8(out, 0);  // a directory
    StoreSize(out + PTR_SIZE, (wptr)strlen(e->guest_path));
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_prestat_dir_name(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr path, wptr len) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e || !e->preopen) return WASI_EBADF;
    size_t n = strlen(e->guest_path);
    if (len < n) return WASI_ENAMETOOLONG;
    memcpy(Ptr(path, n), e->guest_path, n);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_close(struct w2c_wasi__snapshot__preview1 *s, u32 fd) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    if (e->preopen) return WASI_ENOTSUP;
    FD_LOCK();
    int host_fd = e->host_fd;
    e->host_fd = -1;
    FD_UNLOCK();
    int rc = close(host_fd);
    return rc == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_fd_datasync(struct w2c_wasi__snapshot__preview1 *s, u32 fd) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    return fsync(e->host_fd) == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_fd_fdstat_get(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr out) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    struct stat st;
    if (fstat(e->host_fd, &st) != 0) return WasiErrno(errno);
    int fl = fcntl(e->host_fd, F_GETFL);
    uint16_t flags = (fl & O_APPEND) ? WASI_FDFLAGS_APPEND : 0;
    uint64_t rights = WASI_RIGHT_FD_READ | (e->writable ? WASI_RIGHT_FD_WRITE : 0);
    rights |= ~(WASI_RIGHT_FD_READ | WASI_RIGHT_FD_WRITE) & 0x1fffffffull;  // everything else wasi-libc may ask for
    StoreU8(out, FileType(st.st_mode));
    StoreU16(out + 2, flags);
    StoreU64(out + 8, rights);
    StoreU64(out + 16, rights);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_fdstat_set_flags(struct w2c_wasi__snapshot__preview1 *s, u32 fd, u32 flags) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    int fl = (flags & WASI_FDFLAGS_APPEND) ? O_APPEND : 0;
    return fcntl(e->host_fd, F_SETFL, fl) == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_fd_filestat_get(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr out) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    struct stat st;
    if (fstat(e->host_fd, &st) != 0) return WasiErrno(errno);
    StoreFilestat(out, &st);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_filestat_set_size(struct w2c_wasi__snapshot__preview1 *s, u32 fd, u64 size) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    if (!e->writable) return WASI_ENOTCAPABLE;
    return ftruncate(e->host_fd, (off_t)size) == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_fd_read(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr iovs, wptr iovs_len, wptr nread) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    struct iovec iov[MAX_IOVS];
    uint32_t err = Iovecs(iovs, iovs_len, iov, MAX_IOVS);
    if (err) return err;
    ssize_t n = readv(e->host_fd, iov, (int)iovs_len);
    if (n < 0) return WasiErrno(errno);
    StoreSize(nread, (wptr)n);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_pread(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr iovs, wptr iovs_len, u64 offset, wptr nread) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    struct iovec iov[MAX_IOVS];
    uint32_t err = Iovecs(iovs, iovs_len, iov, MAX_IOVS);
    if (err) return err;
    wptr total = 0;
    for (uint32_t i = 0; i < iovs_len; i++) {
        ssize_t n = pread(e->host_fd, iov[i].iov_base, iov[i].iov_len, (off_t)(offset + total));
        if (n < 0) return WasiErrno(errno);
        total += (uint32_t)n;
        if ((size_t)n < iov[i].iov_len) break;
    }
    StoreSize(nread, total);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_write(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr iovs, wptr iovs_len, wptr nwritten) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    if (!e->writable) return WASI_ENOTCAPABLE;
    struct iovec iov[MAX_IOVS];
    uint32_t err = Iovecs(iovs, iovs_len, iov, MAX_IOVS);
    if (err) return err;
    ssize_t n = writev(e->host_fd, iov, (int)iovs_len);
    if (n < 0) return WasiErrno(errno);
    StoreSize(nwritten, (wptr)n);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_pwrite(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr iovs, wptr iovs_len, u64 offset, wptr nwritten) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    if (!e->writable) return WASI_ENOTCAPABLE;
    struct iovec iov[MAX_IOVS];
    uint32_t err = Iovecs(iovs, iovs_len, iov, MAX_IOVS);
    if (err) return err;
    wptr total = 0;
    for (uint32_t i = 0; i < iovs_len; i++) {
        ssize_t n = pwrite(e->host_fd, iov[i].iov_base, iov[i].iov_len, (off_t)(offset + total));
        if (n < 0) return WasiErrno(errno);
        total += (uint32_t)n;
        if ((size_t)n < iov[i].iov_len) break;
    }
    StoreSize(nwritten, total);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_fd_seek(struct w2c_wasi__snapshot__preview1 *s, u32 fd, u64 offset, u32 whence, wptr out) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    int w = whence == 0 ? SEEK_SET : whence == 1 ? SEEK_CUR : SEEK_END;
    off_t r = lseek(e->host_fd, (off_t)offset, w);
    if (r < 0) return WasiErrno(errno);
    StoreU64(out, (uint64_t)r);
    return WASI_ESUCCESS;
}
// Entries are numbered from 1; the cookie is the number of the next entry to deliver
u32 w2c_wasi__snapshot__preview1_fd_readdir(struct w2c_wasi__snapshot__preview1 *s, u32 fd, wptr buf, wptr buf_len, u64 cookie, wptr bufused) {
    (void)s;
    FdEntry *e = Fd(fd);
    if (!e) return WASI_EBADF;
    int dup_fd = dup(e->host_fd);
    if (dup_fd < 0) return WasiErrno(errno);
    DIR *dir = fdopendir(dup_fd);
    if (!dir) { close(dup_fd); return WasiErrno(errno); }
    rewinddir(dir);
    uint64_t index = 0;
    wptr used = 0;
    struct dirent *d;
    while ((d = readdir(dir)) != NULL) {
        index++;
        if (index <= cookie) continue;
        uint32_t namlen = (uint32_t)strlen(d->d_name);
        uint8_t entry[24];
        uint64_t next = index;
        uint64_t ino = (uint64_t)d->d_ino;
        uint8_t type = d->d_type == DT_DIR ? WASI_FILETYPE_DIRECTORY : d->d_type == DT_REG ? WASI_FILETYPE_REGULAR_FILE
                     : d->d_type == DT_LNK ? WASI_FILETYPE_SYMBOLIC_LINK : WASI_FILETYPE_UNKNOWN;
        memcpy(entry, &next, 8);
        memcpy(entry + 8, &ino, 8);
        memcpy(entry + 16, &namlen, 4);
        entry[20] = type; entry[21] = entry[22] = entry[23] = 0;
        // What does not fit is truncated, the caller comes back with a bigger buffer
        wptr room = buf_len - used;
        wptr n = 24 < room ? 24 : room;
        memcpy(Ptr(buf + used, n), entry, n);
        used += n;
        if (n < 24) break;
        room = buf_len - used;
        n = namlen < room ? namlen : room;
        memcpy(Ptr(buf + used, n), d->d_name, n);
        used += n;
        if (n < namlen) break;
    }
    closedir(dir);
    StoreSize(bufused, used);
    return WASI_ESUCCESS;
}

// ---------------------------------------------------------------------------------------------------------------
// Paths, below a directory descriptor
u32 w2c_wasi__snapshot__preview1_path_open(struct w2c_wasi__snapshot__preview1 *s, u32 dirfd, u32 dirflags, wptr path, wptr path_len, u32 oflags, u64 rights_base, u64 rights_inheriting, u32 fdflags, wptr out) {
    (void)s; (void)rights_inheriting;
    FdEntry *dir = Fd(dirfd);
    if (!dir) return WASI_EBADF;
    char p[4096];
    uint32_t err = GuestPath(path, path_len, p, sizeof p);
    if (err) return err;
    bool want_write = (rights_base & WASI_RIGHT_FD_WRITE) || (oflags & (WASI_OFLAGS_CREAT | WASI_OFLAGS_TRUNC));
    if (want_write && !dir->writable) return WASI_ENOTCAPABLE;
    int flags = want_write ? ((rights_base & WASI_RIGHT_FD_READ) ? O_RDWR : O_WRONLY) : O_RDONLY;
    if (oflags & WASI_OFLAGS_CREAT) flags |= O_CREAT;
    if (oflags & WASI_OFLAGS_EXCL) flags |= O_EXCL;
    if (oflags & WASI_OFLAGS_TRUNC) flags |= O_TRUNC;
    if (oflags & WASI_OFLAGS_DIRECTORY) flags |= O_DIRECTORY;
    if (fdflags & WASI_FDFLAGS_APPEND) flags |= O_APPEND;
    if (!(dirflags & WASI_LOOKUP_SYMLINK_FOLLOW)) flags |= O_NOFOLLOW;
    flags |= O_CLOEXEC;
    int host_fd = openat(dir->host_fd, p, flags, 0644);
    if (host_fd < 0) return WasiErrno(errno);
    int fd = AllocFd(host_fd, want_write || dir->writable);
    if (fd < 0) { close(host_fd); return WASI_EMFILE; }
    StoreU32(out, (uint32_t)fd);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_path_filestat_get(struct w2c_wasi__snapshot__preview1 *s, u32 dirfd, u32 flags, wptr path, wptr path_len, wptr out) {
    (void)s;
    FdEntry *dir = Fd(dirfd);
    if (!dir) return WASI_EBADF;
    char p[4096];
    uint32_t err = GuestPath(path, path_len, p, sizeof p);
    if (err) return err;
    struct stat st;
    if (fstatat(dir->host_fd, p, &st, (flags & WASI_LOOKUP_SYMLINK_FOLLOW) ? 0 : AT_SYMLINK_NOFOLLOW) != 0) return WasiErrno(errno);
    StoreFilestat(out, &st);
    return WASI_ESUCCESS;
}
u32 w2c_wasi__snapshot__preview1_path_create_directory(struct w2c_wasi__snapshot__preview1 *s, u32 dirfd, wptr path, wptr path_len) {
    (void)s;
    FdEntry *dir = Fd(dirfd);
    if (!dir) return WASI_EBADF;
    if (!dir->writable) return WASI_ENOTCAPABLE;
    char p[4096];
    uint32_t err = GuestPath(path, path_len, p, sizeof p);
    if (err) return err;
    return mkdirat(dir->host_fd, p, 0755) == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_path_remove_directory(struct w2c_wasi__snapshot__preview1 *s, u32 dirfd, wptr path, wptr path_len) {
    (void)s;
    FdEntry *dir = Fd(dirfd);
    if (!dir) return WASI_EBADF;
    if (!dir->writable) return WASI_ENOTCAPABLE;
    char p[4096];
    uint32_t err = GuestPath(path, path_len, p, sizeof p);
    if (err) return err;
    return unlinkat(dir->host_fd, p, AT_REMOVEDIR) == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_path_unlink_file(struct w2c_wasi__snapshot__preview1 *s, u32 dirfd, wptr path, wptr path_len) {
    (void)s;
    FdEntry *dir = Fd(dirfd);
    if (!dir) return WASI_EBADF;
    if (!dir->writable) return WASI_ENOTCAPABLE;
    char p[4096];
    uint32_t err = GuestPath(path, path_len, p, sizeof p);
    if (err) return err;
    return unlinkat(dir->host_fd, p, 0) == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_path_rename(struct w2c_wasi__snapshot__preview1 *s, u32 dirfd, wptr path, wptr path_len, u32 new_dirfd, wptr new_path, wptr new_path_len) {
    (void)s;
    FdEntry *dir = Fd(dirfd), *new_dir = Fd(new_dirfd);
    if (!dir || !new_dir) return WASI_EBADF;
    if (!dir->writable || !new_dir->writable) return WASI_ENOTCAPABLE;
    char p[4096], np[4096];
    uint32_t err = GuestPath(path, path_len, p, sizeof p);
    if (err) return err;
    err = GuestPath(new_path, new_path_len, np, sizeof np);
    if (err) return err;
    return renameat(dir->host_fd, p, new_dir->host_fd, np) == 0 ? WASI_ESUCCESS : WasiErrno(errno);
}
u32 w2c_wasi__snapshot__preview1_path_readlink(struct w2c_wasi__snapshot__preview1 *s, u32 dirfd, wptr path, wptr path_len, wptr buf, wptr buf_len, wptr bufused) {
    (void)s;
    FdEntry *dir = Fd(dirfd);
    if (!dir) return WASI_EBADF;
    char p[4096];
    uint32_t err = GuestPath(path, path_len, p, sizeof p);
    if (err) return err;
    ssize_t n = readlinkat(dir->host_fd, p, (char *)Ptr(buf, buf_len), buf_len);
    if (n < 0) return WasiErrno(errno);
    StoreSize(bufused, (wptr)n);
    return WASI_ESUCCESS;
}

#ifdef SANDBOX_THREADS
// ---------------------------------------------------------------------------------------------------------------
// Threads: wasi:thread-spawn starts an OS thread that runs the module's wasi_thread_start on an instance of its
// own over the shared memory. A trap on any thread ends the process, like a crash of one Worker ends the tab.
struct w2c_wasi { int unused; };
static struct w2c_env env_imports;
static struct w2c_wasi wasi_imports;
static atomic_int next_tid = 1;

typedef struct { u32 tid; wptr arg; } ThreadStart;

static void *ThreadMain(void *p) {
    ThreadStart start = *(ThreadStart *)p;
    free(p);
    wasm_rt_init_thread();
    w2c_duckdb inst;
    wasm2c_duckdb_instantiate(&inst, &env_imports, &wasi_imports, &sandbox);
    wasm_rt_trap_t trap = (wasm_rt_trap_t)wasm_rt_impl_try();
    if (trap != WASM_RT_TRAP_NONE) {
        fprintf(stderr, "sandbox trapped (thread %u): %s\n", start.tid, wasm_rt_strerror(trap));
        fflush(stderr);
        _exit(3);
    }
    w2c_duckdb_wasi_thread_start(&inst, start.tid, start.arg);
    wasm2c_duckdb_free(&inst);
    wasm_rt_free_thread();
    return NULL;
}

u32 w2c_wasi_thread0x2Dspawn(struct w2c_wasi *w, wptr arg) {
    (void)w;
    ThreadStart *start = malloc(sizeof *start);
    if (!start) return (u32)-WASI_ENOMEM;
    start->tid = (u32)atomic_fetch_add(&next_tid, 1) + 1;
    start->arg = arg;
    pthread_attr_t attr;
    pthread_attr_init(&attr);
    // the translated code runs on the native stack of the thread, DuckDB recurses
    pthread_attr_setstacksize(&attr, 16 << 20);
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);
    pthread_t thread;
    int rc = pthread_create(&thread, &attr, ThreadMain, start);
    pthread_attr_destroy(&attr);
    if (rc != 0) {
        free(start);
        return (u32)-WASI_EAGAIN;
    }
    return start->tid;
}
#endif

// ---------------------------------------------------------------------------------------------------------------
// The process
static void Usage(void) {
    fprintf(stderr,
            "usage: duckdb_native [--dir host[::guest][:rw]]... [--env NAME=VALUE]... -- [runner arguments]\n"
            "  --dir   preopen a host directory for the sandbox, read-only unless :rw is appended\n"
            "  --env   an environment variable for the sandbox (it sees no other, e.g. MIMALLOC_SHOW_ERRORS=1)\n"
            "  the arguments after -- go to the SQL runner (-d database, -t, -q, -c sql)\n");
}

int main(int argc, char **argv) {
    for (int i = 0; i < MAX_FDS; i++) sandbox.fds[i].host_fd = -1;
    sandbox.fds[0] = (FdEntry){0, false, false, NULL};
    sandbox.fds[1] = (FdEntry){1, false, true, NULL};
    sandbox.fds[2] = (FdEntry){2, false, true, NULL};
    static char *guest_envv[64];
    sandbox.envv = guest_envv;
    int i = 1;
    for (; i < argc; i++) {
        if (!strcmp(argv[i], "--")) { i++; break; }
        if (!strcmp(argv[i], "--env") && i + 1 < argc && sandbox.envc < 64 && strchr(argv[i + 1], '=')) {
            guest_envv[sandbox.envc++] = argv[++i];
        } else if (!strcmp(argv[i], "--dir") && i + 1 < argc) {
            char *spec = strdup(argv[++i]);
            bool writable = false;
            size_t len = strlen(spec);
            if (len > 3 && !strcmp(spec + len - 3, ":rw")) { writable = true; spec[len - 3] = 0; }
            char *guest = strstr(spec, "::");
            if (guest) { *guest = 0; guest += 2; } else { guest = spec; }
            int fd = open(spec, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
            if (fd < 0) { fprintf(stderr, "cannot open directory %s: %s\n", spec, strerror(errno)); return 2; }
            int wasi_fd = AllocFd(fd, writable);
            sandbox.fds[wasi_fd].preopen = true;
            sandbox.fds[wasi_fd].guest_path = guest;
        } else {
            Usage();
            return 2;
        }
    }
    // argv[0] and what follows -- are the runner's arguments
    static char *guest_argv[256];
    int guest_argc = 0;
    guest_argv[guest_argc++] = "duckdb_wasi";
    for (; i < argc && guest_argc < 255; i++) guest_argv[guest_argc++] = argv[i];
    sandbox.argc = guest_argc;
    sandbox.argv = guest_argv;

    wasm_rt_init();
    w2c_duckdb inst;
    sandbox.inst = &inst;
#ifdef SANDBOX_THREADS
    // Within the limits the module declares for its import: 256 pages to start, 4 GB (16 GB for wasm64) at most
    wasm_rt_allocate_memory_shared(&shared_memory, 256, PTR_SIZE == 8 ? 262144 : 65536, PTR_SIZE == 8, 65536);
    wasm2c_duckdb_instantiate(&inst, &env_imports, &wasi_imports, &sandbox);
#else
    wasm2c_duckdb_instantiate(&inst, &sandbox);
#endif
    // The lowest page is the far end of the stack (wasi-sdk links --stack-first): inaccessible, a null
    // dereference or a stack overflow is an access fault, which the runtime's signal handler reports as a trap
    if (mprotect(MEM_DATA, 65536, PROT_NONE) != 0) {
        fprintf(stderr, "cannot protect the null page: %s\n", strerror(errno));
        return 2;
    }
    wasm_rt_trap_t trap = (wasm_rt_trap_t)wasm_rt_impl_try();
    if (trap == WASM_RT_TRAP_NONE) {
        w2c_duckdb_0x5Fstart(&inst);
    } else {
        fprintf(stderr, "sandbox trapped: %s\n", wasm_rt_strerror(trap));
        return 3;
    }
    wasm2c_duckdb_free(&inst);
    wasm_rt_free();
    return 0;
}
