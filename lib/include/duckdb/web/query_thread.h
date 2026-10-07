#ifndef INCLUDE_DUCKDB_WEB_QUERY_THREAD_H_
#define INCLUDE_DUCKDB_WEB_QUERY_THREAD_H_

#include <exception>
#include <functional>
#include <optional>
#include <type_traits>

/// With pthreads, DuckDB runs queries on a thread of its own: the main runtime thread must stay available to
/// serve the runtime calls of the worker threads (main_thread.h) and must not block inside DuckDB.
/// Without pthreads the calls run inline.

namespace duckdb {
namespace web {
namespace query_thread {

/// Run a job on the query thread from the main thread and wait for it, serving the runtime meanwhile
void RunJob(const std::function<void()> &job);
/// Is the query thread in use? False without pthreads, and on the query thread itself
bool ShouldDispatch();
/// Stop the query thread
void Stop();

/// Run a callable on the query thread, exceptions come back to the caller
template <typename F>
auto Run(F &&fn) -> decltype(fn()) {
    using R = decltype(fn());
    if (!ShouldDispatch()) return fn();
    std::exception_ptr error;
    if constexpr (std::is_void_v<R>) {
        RunJob([&] {
            try {
                fn();
            } catch (...) {
                error = std::current_exception();
            }
        });
        if (error) std::rethrow_exception(error);
    } else {
        std::optional<R> result;
        RunJob([&] {
            try {
                result.emplace(fn());
            } catch (...) {
                error = std::current_exception();
            }
        });
        if (error) std::rethrow_exception(error);
        return std::move(*result);
    }
}

}  // namespace query_thread
}  // namespace web
}  // namespace duckdb

#endif
