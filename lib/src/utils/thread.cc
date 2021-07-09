#include "duckdb/web/utils/thread.h"

#include <atomic>

namespace duckdb {
namespace web {

#if !EMSCRIPTEN || WEBDB_THREADS
uint32_t GetThreadID() {
    static std::atomic<uint32_t> NEXT_THREAD_ID = 1;
    static thread_local uint32_t THREAD_ID = 0;
    if (THREAD_ID == 0) {
        THREAD_ID = NEXT_THREAD_ID++;
    }
    return THREAD_ID - 1;
};
#else
uint32_t GetThreadID() { return 0; }
#endif

}  // namespace web
}  // namespace duckdb
