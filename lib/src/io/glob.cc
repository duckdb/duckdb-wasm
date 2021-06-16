#include "duckdb/web/io/glob.h"

#include <cstring>
#include <iostream>
#include <regex>
#include <sstream>

namespace duckdb {
namespace web {
namespace io {

// Credits for this go to Nick Fitzgerald:
// https://github.com/fitzgen/glob-to-regexp

// Build a regex for a glob pattern
std::regex glob_to_regex(std::string_view pattern, GlobToRegexOptions options) {
    // The regexp we are building, as a string.
    std::stringstream exp;
    // Match input fully?
    exp << (options.global ? ".*" : "^");
    // Track groups (e.g. {*.html,*.js})
    auto in_group = false;
    // Scan the pattern
    char c;
    for (size_t i = 0; i < pattern.size(); ++i) {
        c = pattern[i];
        switch (c) {
            case '/':
            case '$':
            case '^':
            case '+':
            case '.':
            case '(':
            case ')':
            case '=':
            case '!':
            case '|':
                exp << "\\" << c;
                break;

            case '?':
                if (options.extended) {
                    exp << ".";
                    break;
                }
                exp << "\\" << c;
                break;

            case '[':
            case ']':
                if (options.extended) {
                    exp << c;
                    break;
                }
                exp << "\\" << c;
                break;

            case '{':
                if (options.extended) {
                    in_group = true;
                    exp << "(";
                    break;
                }
                exp << "\\" << c;
                break;

            case '}':
                if (options.extended) {
                    in_group = false;
                    exp << ")";
                    break;
                }
                exp << "\\" << c;
                break;

            case ',':
                if (in_group) {
                    exp << "|";
                    break;
                }
                exp << "\\" << c;
                break;

            case '*': {
                // Move over all consecutive "*"'s.
                // Also store the previous and next characters
                auto prev_char_or_sep = i == 0 ? '/' : pattern[i - 1];
                auto star_count = 1;
                while ((i + 1) < pattern.size() && pattern[i + 1] == '*') {
                    star_count++;
                    i++;
                }
                auto next_char_or_sep = (i + 1) < pattern.size() ? pattern[i + 1] : '/';

                // Treat any number of "*" as one
                if (!options.glob_star) {
                    exp << ".*";
                } else {
                    // Determine if this is a glob_star segment (/**/, **/, /**)
                    if (star_count > 1 && (prev_char_or_sep == '/') && (next_char_or_sep == '/')) {
                        // Match zero or more path segments
                        exp << "((?:[^/]*(?:\\/|$))*)";
                        i++;
                    } else {
                        // Only match one path segment
                        exp << "([^/]*)";
                    }
                }
                break;
            }

            default:
                exp << c;
        }
    }
    // Match input fully?
    exp << (options.global ? ".*" : "$");
    // Case insensitive?
    if (options.case_insensitive) {
        return std::regex{exp.str(), std::regex_constants::icase};
    } else {
        return std::regex{exp.str()};
    }
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
