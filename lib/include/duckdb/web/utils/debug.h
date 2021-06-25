#ifndef INCLUDE_DUCKDB_WEB_UTILS_DEBUG_H_
#define INCLUDE_DUCKDB_WEB_UTILS_DEBUG_H_

#include <cstring>
#include <iostream>

#include "duckdb/web/utils/scope_guard.h"

namespace duckdb {
namespace web {

#define __FILENAME__ (strrchr(__FILE__, '/') ? strrchr(__FILE__, '/') + 1 : __FILE__)

#define MANUAL_DEBUG_TRACE()                                                   \
    auto FILE_NAME_ = __FILENAME__;                                            \
    auto FUNC_NAME_ = __FUNCTION__;                                            \
    std::cout << "[ ENTER ] " << FILE_NAME_ << " " << FUNC_NAME_ << std::endl; \
    auto leave_func = sg::make_scope_guard(                                    \
        [FILE_NAME_, FUNC_NAME_]() { std::cout << "[ EXIT  ] " << FILE_NAME_ << " " << FUNC_NAME_ << std::endl; });

#ifdef WITH_DEBUG_TRACE
#define DEBUG_TRACE() MANUAL_DEBUG_TRACE();
#else
#define DEBUG_TRACE()
#endif

}  // namespace web
}  // namespace duckdb

#endif
