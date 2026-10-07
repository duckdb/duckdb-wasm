#ifndef INCLUDE_DUCKDB_WEB_MAIN_THREAD_H_
#define INCLUDE_DUCKDB_WEB_MAIN_THREAD_H_

#include <atomic>
#include <functional>
#include <type_traits>

/// The runtime (file handles, the OPFS scratch, js_buffer:// files, UDFs) lives in the JavaScript context of the
/// main runtime thread. With pthreads, DuckDB's worker threads run in their own workers with their own JavaScript
/// contexts: everything that reaches the runtime is proxied to the main thread, which serves the requests while it
/// waits for the query thread.
///
/// Without pthreads everything runs inline on the main thread.

namespace duckdb {
namespace web {
namespace main_thread {

/// Are we on the main runtime thread (or is there only one thread)?
bool IsMainThread();
/// Run a function on the main thread and wait for it. From the main thread it runs inline.
void RunSync(const std::function<void()> &fn);
/// Serve proxied calls until `done` becomes non-zero. Called on the main thread while another thread works.
void ServeUntil(std::atomic<int> &done);
/// Wake the main thread out of ServeUntil, after setting its `done` or after queueing work for it
void Wake();

/// Run a callable on the main thread and return its result
template <typename F>
auto OnMainThread(F &&fn) -> decltype(fn()) {
    using R = decltype(fn());
    if (IsMainThread()) return fn();
    if constexpr (std::is_void_v<R>) {
        RunSync([&] { fn(); });
    } else {
        std::optional<R> result;
        RunSync([&] { result.emplace(fn()); });
        return std::move(*result);
    }
}

}  // namespace main_thread
}  // namespace web
}  // namespace duckdb

#endif
