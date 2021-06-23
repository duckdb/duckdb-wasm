#ifndef INCLUDE_DUCKDB_WEB_MINIZ_ZIPPER_H_
#define INCLUDE_DUCKDB_WEB_MINIZ_ZIPPER_H_

#include <optional>
#include <unordered_map>

#include "arrow/result.h"
#include "duckdb.hpp"
#include "duckdb/web/io/file_page_buffer.h"
#include "miniz.hpp"

namespace duckdb {
namespace web {

struct ZipReader {
    /// The file path
    std::string_view file_path = {};
    /// The file buffer
    std::unique_ptr<char[]> file_buffer = nullptr;
    /// The full file buffer
    duckdb_miniz::mz_zip_archive archive;
    /// The data including the global directory
    nonstd::span<char> archive_data = {};
    /// The archive comment
    std::string archive_comment = {};

    /// Constructor
    ZipReader();
    /// Destructor
    ~ZipReader();
};

class Zipper {
   protected:
    /// The filesystem
    std::shared_ptr<io::FilePageBuffer> buffer_manager_;
    /// The loaded archives
    std::optional<ZipReader> current_reader_ = std::nullopt;

   public:
    /// Constructor
    Zipper(std::shared_ptr<io::FilePageBuffer> buffer_manager);

    /// Load zip from a buffer
    arrow::Status LoadFromFile(std::string_view path);
    /// Read the number of files in the archive
    arrow::Result<size_t> ReadEntryCount();
    /// Read the entry info as JSON
    arrow::Result<std::string> ReadEntryInfoAsJSON(size_t entryID);
    /// Extract an entry to a path
    arrow::Result<size_t> ExtractEntryToPath(size_t entryID, std::string_view path);
    /// Extract a path to a path
    arrow::Result<size_t> ExtractPathToPath(const char* in, std::string_view out);
};

}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_MINIZ_ZIPPER_H_
