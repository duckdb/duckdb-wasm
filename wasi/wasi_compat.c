// What wasi-libc's emulated mman does not provide: page locking and advice are no-ops in a sandbox, memory maps
// are copies, so syncing one is nothing to do either.
#include <sys/mman.h>

int mlock(const void *addr, size_t len) { (void)addr; (void)len; return 0; }
int munlock(const void *addr, size_t len) { (void)addr; (void)len; return 0; }
int msync(void *addr, size_t len, int flags) { (void)addr; (void)len; (void)flags; return 0; }
int madvise(void *addr, size_t len, int advice) { (void)addr; (void)len; (void)advice; return 0; }
