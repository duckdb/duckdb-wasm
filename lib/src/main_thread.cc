#include "duckdb/web/main_thread.h"

#include <exception>
#include <stdexcept>

#if defined(__EMSCRIPTEN_PTHREADS__)
#include <emscripten/proxying.h>
#include <emscripten/threading.h>
#include <pthread.h>
#endif

namespace duckdb {
namespace web {
namespace main_thread {

#if defined(__EMSCRIPTEN_PTHREADS__)

namespace {
/// The queue of calls for the main thread
emscripten::ProxyingQueue &Queue() {
    static emscripten::ProxyingQueue queue;
    return queue;
}
/// The main thread waits on this word while it serves
std::atomic<int> main_wake{0};
}  // namespace

bool IsMainThread() { return emscripten_is_main_runtime_thread(); }

void Wake() {
    main_wake.store(1);
    emscripten_futex_wake(&main_wake, 1);
}

void RunSync(const std::function<void()> &fn) {
    if (IsMainThread()) {
        fn();
        return;
    }
    std::atomic<int> done{0};
    // An exception of the call is thrown on the calling thread, not on the main thread
    std::exception_ptr error;
    // Queued asynchronously, the main thread is woken through our own word: it waits in ServeUntil, not in the
    // event loop where the queue's own notification would reach it
    bool queued = Queue().proxyAsync(emscripten_main_runtime_thread_id(), [&] {
        try {
            fn();
        } catch (...) {
            error = std::current_exception();
        }
        done.store(1);
        emscripten_futex_wake(&done, 1);
    });
    if (!queued) {
        throw std::runtime_error("Cannot proxy a call to the main thread");
    }
    Wake();
    while (done.load() == 0) {
        emscripten_futex_wait(&done, 0, 1e9);
    }
    if (error) std::rethrow_exception(error);
}

void ServeUntil(std::atomic<int> &done) {
    while (done.load() == 0) {
        main_wake.store(0);
        // Our calls, then what emscripten proxies to the main thread itself (dlopen from a pthread)
        Queue().execute();
        emscripten_proxy_execute_queue(emscripten_proxy_get_system_queue());
        if (done.load() != 0) break;
        // A wake that arrived since the store above is seen by the wait, the word is no longer 0
        emscripten_futex_wait(&main_wake, 0, 1.0);
    }
}

#else

bool IsMainThread() { return true; }
void Wake() {}
void RunSync(const std::function<void()> &fn) { fn(); }
void ServeUntil(std::atomic<int> &done) {
    while (done.load() == 0) {
    }
}

#endif

}  // namespace main_thread
}  // namespace web
}  // namespace duckdb

#if defined(__EMSCRIPTEN_PTHREADS__)
/// pthread_create from a pthread asks the main thread through a message the main thread only sees in its event
/// loop; while it serves a query from ServeUntil the thread would never start (SET threads = N runs on the query
/// thread). Linked with --wrap=pthread_create: the creation itself is proxied to the main thread.
extern "C" int __real_pthread_create(pthread_t *thread, const pthread_attr_t *attr, void *(*start)(void *),
                                     void *arg);
extern "C" int __wrap_pthread_create(pthread_t *thread, const pthread_attr_t *attr, void *(*start)(void *),
                                     void *arg) {
    return duckdb::web::main_thread::OnMainThread([&] { return __real_pthread_create(thread, attr, start, arg); });
}
#endif
