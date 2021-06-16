#ifndef INCLUDE_DUCKDB_WEB_GLOB_H_
#define INCLUDE_DUCKDB_WEB_GLOB_H_

#include <initializer_list>
#include <regex>
#include <string_view>

namespace duckdb {
namespace web {
namespace io {

struct GlobToRegexOptions {
    /// Enables "extended" globs (like bash) which
    /// supports single character matching, matching ranges of characters,
    /// group matching, etc.
    bool extended = false;
    /// glob_star determines whether a star should match trailing paths
    /// '/foo/*' => '^\/foo\/.*$' vs. '^\/foo\/[^/]*$'
    ///             true              false
    bool glob_star = false;
    /// Case insensitive matching
    bool case_insensitive = false;
    /// Match anywhere in the string?
    bool global = false;
};

std::regex glob_to_regex(std::string_view glob, GlobToRegexOptions options = {});

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
