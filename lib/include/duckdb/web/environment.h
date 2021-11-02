#ifndef INCLUDE_DUCKDB_WEB_UTILS_ENVIRONMENT_H_
#define INCLUDE_DUCKDB_WEB_UTILS_ENVIRONMENT_H_

namespace duckdb {
namespace web {

enum class Environment { WEB, NATIVE };

#if EMSCRIPTEN
constexpr auto ENVIRONMENT = Environment::WEB;
#else
constexpr auto ENVIRONMENT = Environment::NATIVE;
#endif

enum NativeTag { NATIVE };
enum WebTag { WEB };

}  // namespace web
}  // namespace duckdb

#endif
