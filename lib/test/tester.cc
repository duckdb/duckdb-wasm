#include <filesystem>
#include <string_view>

#include "duckdb/web/test/config.h"
#include "gflags/gflags.h"
#include "gtest/gtest.h"

using namespace duckdb::web::test;

DEFINE_string(source_dir, "", "Source directory");

namespace duckdb {
namespace web {
namespace test {

std::filesystem::path SOURCE_DIR;

}
}  // namespace web
}  // namespace duckdb

int main(int argc, char* argv[]) {
    gflags::AllowCommandLineReparsing();
    gflags::SetUsageMessage("Usage: ./tester --source_dir <dir>");
    gflags::ParseCommandLineFlags(&argc, &argv, false);

    if (std::filesystem::exists(FLAGS_source_dir)) {
        SOURCE_DIR = std::filesystem::path{FLAGS_source_dir};
    }

    testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
