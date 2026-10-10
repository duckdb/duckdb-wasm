// memory.atomic.wait32/64 and memory.atomic.notify for the wasm2c-translated module (our wabt patch emits calls
// to these): a futex over the shared linear memory. On macOS 14.4+ and Linux the kernel's own wait-on-address
// is used, waking exactly the waiters of that word (the memory is private to the process, so the NONE flags);
// elsewhere condition variables bucketed by address.
#include <errno.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <string.h>
#include <sys/time.h>
#include <time.h>

#include "wasm-rt.h"

typedef uint32_t u32;
typedef uint64_t u64;

#if defined(__APPLE__) && __has_include(<os/os_sync_wait_on_address.h>)
#include <os/os_sync_wait_on_address.h>
#define FUTEX_OS_SYNC 1
#elif defined(__linux__)
#include <linux/futex.h>
#include <sys/syscall.h>
#include <unistd.h>
#define FUTEX_LINUX 1
#endif

// 0: woken, 1: the value was not the expected one, 2: timed out
#if defined(FUTEX_OS_SYNC)

static int32_t Wait(wasm_rt_shared_memory_t *mem, u64 addr, int wide, u64 expected, int64_t timeout_ns) {
    void *word = (void *)(mem->data + addr);
    size_t size = wide ? 8 : 4;
    u64 current = wide ? atomic_load((_Atomic u64 *)word) : atomic_load((_Atomic u32 *)word);
    if (current != expected) return 1;
    int rc;
    if (timeout_ns < 0) {
        rc = os_sync_wait_on_address(word, expected, size, OS_SYNC_WAIT_ON_ADDRESS_NONE);
    } else {
        rc = os_sync_wait_on_address_with_timeout(word, expected, size, OS_SYNC_WAIT_ON_ADDRESS_NONE,
                                                  OS_CLOCK_MACH_ABSOLUTE_TIME, (uint64_t)timeout_ns);
    }
    if (rc >= 0) return 0;
    if (errno == ETIMEDOUT) return 2;
    // EINTR or a mismatch noticed by the kernel: the caller re-checks the word either way
    return 0;
}

static u32 Notify(wasm_rt_shared_memory_t *mem, u64 addr, u32 count) {
    void *word = (void *)(mem->data + addr);
    if (count == 0) return 0;
    if (count == 1) {
        return os_sync_wake_by_address_any(word, 4, OS_SYNC_WAKE_BY_ADDRESS_NONE) == 0 ? 1 : 0;
    }
    return os_sync_wake_by_address_all(word, 4, OS_SYNC_WAKE_BY_ADDRESS_NONE) == 0 ? count : 0;
}

#elif defined(FUTEX_LINUX)

static int32_t Wait(wasm_rt_shared_memory_t *mem, u64 addr, int wide, u64 expected, int64_t timeout_ns) {
    void *word = (void *)(mem->data + addr);
    u64 current = wide ? atomic_load((_Atomic u64 *)word) : atomic_load((_Atomic u32 *)word);
    if (current != expected) return 1;
    // the kernel compares 32 bits: for a 64-bit word that is the low half (little endian), the full compare was
    // done above and the caller re-checks after waking
    struct timespec ts, *tsp = NULL;
    if (timeout_ns >= 0) {
        ts.tv_sec = timeout_ns / 1000000000ll;
        ts.tv_nsec = timeout_ns % 1000000000ll;
        tsp = &ts;
    }
    long rc = syscall(SYS_futex, word, FUTEX_WAIT, (u32)expected, tsp, NULL, 0);
    if (rc == 0) return 0;
    if (errno == ETIMEDOUT) return 2;
    if (errno == EAGAIN) return 1;
    return 0;
}

static u32 Notify(wasm_rt_shared_memory_t *mem, u64 addr, u32 count) {
    void *word = (void *)(mem->data + addr);
    long rc = syscall(SYS_futex, word, FUTEX_WAKE, (int)(count > INT32_MAX ? INT32_MAX : count), NULL, NULL, 0);
    return rc < 0 ? 0 : (u32)rc;
}

#else

#define BUCKETS 256

typedef struct {
    pthread_mutex_t lock;
    pthread_cond_t cond;
    uint64_t generation;
    uint32_t waiters;
} Bucket;

static Bucket buckets[BUCKETS];
static pthread_once_t once = PTHREAD_ONCE_INIT;

static void Init(void) {
    for (int i = 0; i < BUCKETS; i++) {
        pthread_mutex_init(&buckets[i].lock, NULL);
        pthread_cond_init(&buckets[i].cond, NULL);
    }
}

static Bucket *BucketFor(u64 addr) {
    pthread_once(&once, Init);
    return &buckets[(addr >> 2) % BUCKETS];
}

static int32_t Wait(wasm_rt_shared_memory_t *mem, u64 addr, int wide, u64 expected, int64_t timeout_ns) {
    Bucket *b = BucketFor(addr);
    pthread_mutex_lock(&b->lock);
    u64 current = wide ? atomic_load((_Atomic u64 *)(mem->data + addr)) : atomic_load((_Atomic u32 *)(mem->data + addr));
    if (current != expected) {
        pthread_mutex_unlock(&b->lock);
        return 1;
    }
    struct timespec deadline;
    if (timeout_ns >= 0) {
        struct timeval now;
        gettimeofday(&now, NULL);
        uint64_t ns = (uint64_t)now.tv_usec * 1000 + (uint64_t)timeout_ns;
        deadline.tv_sec = now.tv_sec + (time_t)(ns / 1000000000ull);
        deadline.tv_nsec = (long)(ns % 1000000000ull);
    }
    uint64_t generation = b->generation;
    int32_t result = 0;
    b->waiters++;
    while (b->generation == generation) {
        if (timeout_ns >= 0) {
            if (pthread_cond_timedwait(&b->cond, &b->lock, &deadline) == ETIMEDOUT) {
                result = b->generation == generation ? 2 : 0;
                break;
            }
        } else {
            pthread_cond_wait(&b->cond, &b->lock);
        }
    }
    b->waiters--;
    pthread_mutex_unlock(&b->lock);
    return result;
}

static u32 Notify(wasm_rt_shared_memory_t *mem, u64 addr, u32 count) {
    (void)mem;
    Bucket *b = BucketFor(addr);
    pthread_mutex_lock(&b->lock);
    uint32_t woken = b->waiters < count ? b->waiters : count;
    if (b->waiters) {
        b->generation++;
        pthread_cond_broadcast(&b->cond);
    }
    pthread_mutex_unlock(&b->lock);
    return woken;
}

#endif

int32_t wasm_rt_memory_atomic_wait32(wasm_rt_shared_memory_t *mem, u64 addr, u32 expected, int64_t timeout_ns) {
    return Wait(mem, addr, 0, expected, timeout_ns);
}

int32_t wasm_rt_memory_atomic_wait64(wasm_rt_shared_memory_t *mem, u64 addr, u64 expected, int64_t timeout_ns) {
    return Wait(mem, addr, 1, expected, timeout_ns);
}

u32 wasm_rt_memory_atomic_notify(wasm_rt_shared_memory_t *mem, u64 addr, u32 count) {
    return Notify(mem, addr, count);
}
