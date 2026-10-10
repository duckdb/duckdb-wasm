// memory.atomic.wait32/64 and memory.atomic.notify for the wasm2c-translated module (our wabt patch emits calls
// to these): a futex over the shared linear memory, with condition variables bucketed by address.
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

#define BUCKETS 256

typedef struct {
    pthread_mutex_t lock;
    pthread_cond_t cond;
    // bumped by every notify, so a waiter can tell a notification from a spurious wakeup
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

// 0: woken, 1: the value was not the expected one, 2: timed out
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

int32_t wasm_rt_memory_atomic_wait32(wasm_rt_shared_memory_t *mem, u64 addr, u32 expected, int64_t timeout_ns) {
    return Wait(mem, addr, 0, expected, timeout_ns);
}

int32_t wasm_rt_memory_atomic_wait64(wasm_rt_shared_memory_t *mem, u64 addr, u64 expected, int64_t timeout_ns) {
    return Wait(mem, addr, 1, expected, timeout_ns);
}

// Wakes everyone waiting in the bucket (they re-check their own word); reports at most count of them
u32 wasm_rt_memory_atomic_notify(wasm_rt_shared_memory_t *mem, u64 addr, u32 count) {
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
