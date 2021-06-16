#include "duckdb/web/io/glob.h"

#include <regex>

#include "gtest/gtest.h"

using namespace duckdb::web::io;

namespace {

void assert_match(std::string_view glob, const std::string& input, GlobToRegexOptions options = {}) {
    auto regex = glob_to_regex(glob, options);
    ASSERT_TRUE(std::regex_match(input, regex)) << "glob=" << glob << " input=" << input;
};
void assert_no_match(std::string_view glob, const std::string& input, GlobToRegexOptions options = {}) {
    auto regex = glob_to_regex(glob, options);
    ASSERT_FALSE(std::regex_match(input, regex)) << "glob=" << glob << " input=" << input;
};

// NOLINTNEXTLINE

void test(bool globstar) {
    assert_match("*", "foo");
    assert_match("*", "foo", {.global = true});
    assert_match("f*", "foo");
    assert_match("f*", "foo", {.global = true});
    assert_match("*o", "o");
    assert_match("*o", "o", {.global = true});
    assert_match("f*uck", "firetruck");
    assert_match("f*uck", "firetruck", {.global = true});
    assert_no_match("uc", "firetruck");
    assert_match("uc", "firetruck", {.global = true});
    assert_match("f*uck", "fuck");
    assert_match("f*uck", "fuck", {.global = true});
    assert_match("*.min.js", "http://example.com/jquery.min.js", {.glob_star = false});
    assert_match("*.min.*", "http://example.com/jquery.min.js", {.glob_star = false});
    assert_match("*/js/*.js", "http://example.com/js/jquery.min.js", {.glob_star = false});
    assert_match("*.min.*", "http://example.com/jquery.min.js", {.global = true});
    assert_match("*.min.js", "http://example.com/jquery.min.js", {.global = true});
    assert_match("*/js/*.js", "http://example.com/js/jquery.min.js", {.global = true});

    auto testStr = "\\\\/$^+?.()=!|{},[].*";
    auto targetStr = "\\/$^+?.()=!|{},[].*";
    assert_match(testStr, targetStr);
    assert_match(testStr, targetStr, {.global = true});

    // Equivalent matches without/with using RegExp 'g'
    assert_no_match(".min.", "http://example.com/jquery.min.js");
    assert_match("*.min.*", "http://example.com/jquery.min.js");
    assert_match(".min.", "http://example.com/jquery.min.js", {.global = true});

    assert_no_match("http:", "http://example.com/jquery.min.js");
    assert_match("http:*", "http://example.com/jquery.min.js");
    assert_match("http:", "http://example.com/jquery.min.js", {.global = true});

    assert_no_match("min.js", "http://example.com/jquery.min.js");
    assert_match("*.min.js", "http://example.com/jquery.min.js");
    assert_match("min.js", "http://example.com/jquery.min.js", {.global = true});

    // Match anywhere (globally) using RegExp 'g'
    assert_match("min", "http://example.com/jquery.min.js", {.global = true});
    assert_match("/js/", "http://example.com/js/jquery.min.js", {.global = true});

    assert_no_match("/js*jq*.js", "http://example.com/js/jquery.min.js");
    assert_match("/js*jq*.js", "http://example.com/js/jquery.min.js", {.global = true});

    // Extended mode

    // ?: Match one character, no more and no less
    assert_match("f?o", "foo", {.extended = true});
    assert_no_match("f?o", "fooo", {.extended = true});
    assert_no_match("f?oo", "foo", {.extended = true});

    // ?: Match one character with RegExp 'g'
    assert_match("f?o", "foo", {.extended = true, .glob_star = globstar, .global = true});
    assert_match("f?o", "fooo", {.extended = true, .glob_star = globstar, .global = true});
    assert_match("f?o?", "fooo", {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("?fo", "fooo", {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("f?oo", "foo", {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("foo?", "foo", {.extended = true, .glob_star = globstar, .global = true});

    // []: Match a character range
    assert_match("fo[oz]", "foo", {.extended = true});
    assert_match("fo[oz]", "foz", {.extended = true});
    assert_no_match("fo[oz]", "fog", {.extended = true});

    // []: Match a character range and RegExp 'g' (regresion)
    assert_match("fo[oz]", "foo", {.extended = true, .glob_star = globstar, .global = true});
    assert_match("fo[oz]", "foz", {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("fo[oz]", "fog", {.extended = true, .glob_star = globstar, .global = true});

    // {}: Match a choice of different substrings
    assert_match("foo{bar,baaz}", "foobaaz", {.extended = true});
    assert_match("foo{bar,baaz}", "foobar", {.extended = true});
    assert_no_match("foo{bar,baaz}", "foobuzz", {.extended = true});
    assert_match("foo{bar,b*z}", "foobuzz", {.extended = true});

    // {}: Match a choice of different substrings and RegExp 'g' (regression)
    assert_match("foo{bar,baaz}", "foobaaz", {.extended = true, .glob_star = globstar, .global = true});
    assert_match("foo{bar,baaz}", "foobar", {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("foo{bar,baaz}", "foobuzz", {.extended = true, .glob_star = globstar, .global = true});
    assert_match("foo{bar,b*z}", "foobuzz", {.extended = true, .glob_star = globstar, .global = true});

    // More complex extended matches
    assert_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://foo.baaz.com/jquery.min.js", {.extended = true});
    assert_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.html", {.extended = true});
    assert_no_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.htm", {.extended = true});
    assert_no_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.bar.com/index.html", {.extended = true});
    assert_no_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://flozz.buzz.com/index.html", {.extended = true});

    // More complex extended matches and RegExp 'g' (regresion)
    assert_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://foo.baaz.com/jquery.min.js",
                 {.extended = true, .glob_star = globstar, .global = true});
    assert_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.html",
                 {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.htm",
                    {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.bar.com/index.html",
                    {.extended = true, .glob_star = globstar, .global = true});
    assert_no_match("http://?o[oz].b*z.com/{*.js,*.html}", "http://flozz.buzz.com/index.html",
                    {.extended = true, .glob_star = globstar, .global = true});

    // globstar
    assert_match("http://foo.com/**/{*.js,*.html}", "http://foo.com/bar/jquery.min.js",
                 {.extended = true, .glob_star = globstar, .global = true});
    assert_match("http://foo.com/**/{*.js,*.html}", "http://foo.com/bar/baz/jquery.min.js",
                 {.extended = true, .glob_star = globstar, .global = true});
    assert_match("http://foo.com/**", "http://foo.com/bar/baz/jquery.min.js",
                 {.extended = true, .glob_star = globstar, .global = true});

    // Remaining special chars should still match themselves
    // Test string  "\\\\/$^+.()=!|,.*"  represents  <glob>\\/$^+.()=!|,.*</glob>
    // The equivalent regex is:  /^\\\/\$\^\+\.\(\)\=\!\|\,\..*$/
    // Both glob and regex match:  \/$^+.()=!|,.*
    // auto ext_blob = "\\\\/$^+.()=!|,.*";
    // auto ext_input = "\\/$^+.()=!|,.*";
    auto ext_blob = "\\\\/$^+.()=!|,.*";
    auto ext_input = "\\/$^+.()=!|,.*";
    assert_match(ext_blob, ext_input, {.extended = true});
    assert_match(ext_blob, ext_input, {.extended = true, .glob_star = globstar, .global = true});

    // Globstar specific tests
    assert_match("/foo/*", "/foo/bar.txt", {.glob_star = true});
    assert_match("/foo/**", "/foo/baz.txt", {.glob_star = true});
    assert_match("/foo/**", "/foo/bar/baz.txt", {.glob_star = true});
    assert_match("/foo/*/*.txt", "/foo/bar/baz.txt", {.glob_star = true});
    assert_match("/foo/**/*.txt", "/foo/bar/baz.txt", {.glob_star = true});
    assert_match("/foo/**/*.txt", "/foo/bar/baz/qux.txt", {.glob_star = true});
    assert_match("/foo/**/bar.txt", "/foo/bar.txt", {.glob_star = true});
    assert_match("/foo/**/**/bar.txt", "/foo/bar.txt", {.glob_star = true});
    assert_match("/foo/**/*/baz.txt", "/foo/bar/baz.txt", {.glob_star = true});
    assert_match("/foo/**/*.txt", "/foo/bar.txt", {.glob_star = true});
    assert_match("/foo/**/**/*.txt", "/foo/bar.txt", {.glob_star = true});
    assert_match("/foo/**/*/*.txt", "/foo/bar/baz.txt", {.glob_star = true});
    assert_match("**/*.txt", "/foo/bar/baz/qux.txt", {.glob_star = true});
    assert_match("**/foo.txt", "foo.txt", {.glob_star = true});
    assert_match("**/*.txt", "foo.txt", {.glob_star = true});

    assert_no_match("/foo/*", "/foo/bar/baz.txt", {.glob_star = true});
    assert_no_match("/foo/*.txt", "/foo/bar/baz.txt", {.glob_star = true});
    assert_no_match("/foo/*/*.txt", "/foo/bar/baz/qux.txt", {.glob_star = true});
    assert_no_match("/foo/*/bar.txt", "/foo/bar.txt", {.glob_star = true});
    assert_no_match("/foo/*/*/baz.txt", "/foo/bar/baz.txt", {.glob_star = true});
    assert_no_match("/foo/**.txt", "/foo/bar/baz/qux.txt", {.glob_star = true});
    assert_no_match("/foo/bar**/*.txt", "/foo/bar/baz/qux.txt", {.glob_star = true});
    assert_no_match("/foo/bar**", "/foo/bar/baz.txt", {.glob_star = true});
    assert_no_match("**/.txt", "/foo/bar/baz/qux.txt", {.glob_star = true});
    assert_no_match("*/*.txt", "/foo/bar/baz/qux.txt", {.glob_star = true});
    assert_no_match("*/*.txt", "foo.txt", {.glob_star = true});

    assert_no_match("http://foo.com/*", "http://foo.com/bar/baz/jquery.min.js", {.extended = true, .glob_star = true});
    assert_no_match("http://foo.com/*", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = true});

    assert_match("http://foo.com/*", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = false});
    assert_match("http://foo.com/**", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = true});

    assert_match("http://foo.com/*/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = true});
    assert_match("http://foo.com/**/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = true});
    assert_match("http://foo.com/*/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = false});
    assert_match("http://foo.com/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = false});
    assert_no_match("http://foo.com/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", {.glob_star = true});
}

TEST(GlobTest, globstar) {
    test(false);
    test(true);
}

}  // namespace
