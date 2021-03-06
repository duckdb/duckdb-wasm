#include "duckdb/web/io/ifstream.h"

#include <fstream>

#include "duckdb/web/test/config.h"
#include "gtest/gtest.h"

using namespace duckdb::web;
using namespace std;

namespace {

TEST(InputStreamBuffer, istreambuf_iterator) {
    auto fs = duckdb::FileSystem::CreateLocal();
    auto file_page_buffer = std::make_shared<io::FilePageBuffer>(std::move(fs));
    auto path = duckdb::web::test::SOURCE_DIR / ".." / "data" / "test.json";
    std::string expected;
    std::string have;
    {
        std::ifstream ifs{path};
        expected = {std::istreambuf_iterator<char>{ifs}, std::istreambuf_iterator<char>{}};
    }
    auto input = std::make_shared<io::InputFileStreamBuffer>(file_page_buffer, path.c_str());
    {
        std::istream ifs{input.get()};
        have = {std::istreambuf_iterator<char>{ifs}, std::istreambuf_iterator<char>{}};
    }
    ASSERT_EQ(expected, have);
}

}  // namespace
