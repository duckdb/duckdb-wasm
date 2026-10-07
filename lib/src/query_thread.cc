#include "duckdb/web/query_thread.h"

#include <atomic>
#include <condition_variable>
#include <mutex>
#include <stdexcept>
#include <thread>

#include "duckdb/web/main_thread.h"

namespace duckdb {
namespace web {
namespace query_thread {

#if defined(__EMSCRIPTEN_PTHREADS__)

namespace {
struct State {
    std::mutex mutex;
    std::condition_variable work;
    const std::function<void()> *job = nullptr;
    bool stop = false;
    std::atomic<int> done{0};
    std::thread thread;
    std::thread::id id;
};
State &Get() {
    static State state;
    return state;
}

void Loop() {
    auto &state = Get();
    while (true) {
        const std::function<void()> *job = nullptr;
        {
            std::unique_lock<std::mutex> lock{state.mutex};
            state.work.wait(lock, [&] { return state.job != nullptr || state.stop; });
            if (state.stop) return;
            job = state.job;
            state.job = nullptr;
        }
        (*job)();
        state.done.store(1);
        main_thread::Wake();
    }
}

void Start() {
    auto &state = Get();
    if (state.thread.joinable()) return;
    state.thread = std::thread(Loop);
    state.id = state.thread.get_id();
}
}  // namespace

bool ShouldDispatch() {
    // Only the main thread dispatches: a job on the query thread that reaches this runs inline
    return main_thread::IsMainThread();
}

void RunJob(const std::function<void()> &job) {
    auto &state = Get();
    Start();
    state.done.store(0);
    {
        std::lock_guard<std::mutex> lock{state.mutex};
        state.job = &job;
    }
    state.work.notify_one();
    main_thread::ServeUntil(state.done);
}

void Stop() {
    auto &state = Get();
    if (!state.thread.joinable()) return;
    {
        std::lock_guard<std::mutex> lock{state.mutex};
        state.stop = true;
    }
    state.work.notify_one();
    state.thread.join();
}

#else

bool ShouldDispatch() { return false; }
void RunJob(const std::function<void()> &job) { job(); }
void Stop() {}

#endif

}  // namespace query_thread
}  // namespace web
}  // namespace duckdb
