#include "duckdb/web/miniz_zipper.h"

#include <iostream>

#include "arrow/status.h"
#include "duckdb/common/file_system.hpp"
#include "miniz.hpp"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/writer.h"

namespace duckdb {
namespace web {

/// Constructor
ZipReader::ZipReader() { std::memset(&archive, 0, sizeof(duckdb_miniz::mz_zip_archive)); }
/// Destructor
ZipReader::~ZipReader() { duckdb_miniz::mz_zip_reader_end(&archive); }

/// Constructor
Zipper::Zipper(std::shared_ptr<io::FileSystemBuffer> buffer_manager) : buffer_manager_(std::move(buffer_manager)) {}

/// Open a zip archive.
///
/// The central directory of the zip file sits at the end of the zip archive.
/// The file entries within the central directory point backwards into the file.
/// Archive files can have trailing comments that have their length stored as last field in the dictionary.
///
/// |-----------|--------------|--------------|xxxxxxxxxxxxxxcc|
/// |           |                              ||
/// +-----------|------------------------------+|
///             +-------------------------------+
///
arrow::Status Zipper::LoadFromFile(std::string_view path) {
    /// Already loaded?
    if (current_reader_ && current_reader_->file_path == path) {
        return arrow::Status::OK();
    }

    /// Read the full file into the buffer.
    /// XXX Miniz currently does not support streaming archive extraction.
    ///     We'd actually prefer reading the file incrementally.
    std::unique_ptr<char[]> buffer = nullptr;
    size_t buffer_size = 0;
    {
        auto file = buffer_manager_->OpenFile(path);
        buffer_size = file->GetSize();
        buffer = std::unique_ptr<char[]>(new char[buffer_size]());
        file->Read(buffer.get(), buffer_size, 0);
    }
    if (buffer_size == 0) return arrow::Status::ExecutionError("couldn't read file");

    // Cut trailing archive comment
    nonstd::span<char> archive_data;
    std::string archive_comment;
    {
        archive_data = nonstd::span<char>{buffer.get(), buffer.get() + buffer_size};
        ssize_t position = archive_data.size() - 1;
        for (; position >= 3; position--) {
            if (archive_data[position - 3] == 'P' && archive_data[position - 2] == 'K' &&
                archive_data[position - 1] == '\x05' && archive_data[position] == '\x06') {
                position = position + 17;
                break;
            }
        }
        if (position == 3) {
            return arrow::Status{arrow::StatusCode::ExecutionError, "didn't find end of central directory signature"};
        }
        auto comment_length = static_cast<uint16_t>(archive_data[position + 1]);
        comment_length = static_cast<uint16_t>(comment_length << 8) + static_cast<uint16_t>(archive_data[position]);
        position += 2;

        if (comment_length != 0) {
            archive_comment = {archive_data.data() + position, static_cast<size_t>(comment_length)};
            archive_data = archive_data.subspan(0, archive_data.size() - comment_length);
            archive_data[archive_data.size() - 1] = 0;
            archive_data[archive_data.size() - 2] = 0;
        }
    }

    // Register as loaded archive
    auto& reader = current_reader_.emplace();
    reader.file_path = path;
    reader.file_buffer = std::move(buffer);
    reader.archive_comment = std::move(archive_comment);
    reader.archive_data = std::move(archive_data);

    // Load the miniz archive
    auto ok = duckdb_miniz::mz_zip_reader_init_mem(&reader.archive, archive_data.data(), archive_data.size(), 0);
    if (!ok) {
        auto error = duckdb_miniz::mz_zip_get_last_error(&reader.archive);
        auto msg = std::string{duckdb_miniz::mz_zip_get_error_string(error)};
        current_reader_.reset();
        return arrow::Status{arrow::StatusCode::ExecutionError, msg};
    }

    return arrow::Status::OK();
};

/// Get the number of entries in the archive
arrow::Result<size_t> Zipper::ReadEntryCount() {
    if (!current_reader_) return 0;
    return duckdb_miniz::mz_zip_reader_get_num_files(&current_reader_->archive);
}

/// Get the entry info as JSON
arrow::Result<std::string> Zipper::ReadEntryInfoAsJSON(size_t entryID) {
    if (!current_reader_) return "";
    duckdb_miniz::mz_zip_archive_file_stat stat;
    duckdb_miniz::mz_zip_reader_file_stat(&current_reader_->archive, entryID, &stat);

    rapidjson::StringBuffer out;
    rapidjson::Writer writer(out);
    writer.StartObject();
    writer.Key("fileName");
    writer.String(stat.m_filename, std::strlen(stat.m_filename));
    writer.Key("versionMadeBy");
    writer.Uint(stat.m_version_made_by);
    writer.Key("versionNeeded");
    writer.Uint(stat.m_version_needed);
    writer.Key("centralDirOffset");
    writer.Uint(stat.m_central_dir_ofs);
    writer.Key("headerOffset");
    writer.Uint(stat.m_local_header_ofs);
    writer.Key("crc32");
    writer.Uint(stat.m_crc32);
    writer.Key("bitFlag");
    writer.Uint(stat.m_bit_flag);
    writer.Key("method");
    writer.Uint(stat.m_method);
    writer.Key("sizeCompressed");
    writer.Uint(stat.m_comp_size);
    writer.Key("sizeUncompressed");
    writer.Uint(stat.m_uncomp_size);
    writer.Key("attributesInternal");
    writer.Uint(stat.m_internal_attr);
    writer.Key("attributesExternal");
    writer.Uint(stat.m_external_attr);
    writer.Key("isDirectory");
    writer.Bool(stat.m_is_directory);
    writer.Key("isEncrypted");
    writer.Bool(stat.m_is_encrypted);
    writer.Key("isSupported");
    writer.Bool(stat.m_is_supported);
    writer.Key("comment");
    writer.String(stat.m_comment, stat.m_comment_size);
    writer.EndObject();
    return out.GetString();
}

struct ExtractToFileSystemBufferState {
    /// The buffer manager
    io::FileSystemBuffer& buffer_manager;
    /// The file
    std::shared_ptr<io::FileSystemBuffer::FileRef> file;

    /// Constructor
    ExtractToFileSystemBufferState(io::FileSystemBuffer& buffer_manager,
                                   std::shared_ptr<io::FileSystemBuffer::FileRef> file)
        : buffer_manager(buffer_manager), file(file) {}
};

size_t extractToFileSystemBuffer(void* p_opaque, duckdb_miniz::mz_uint64 file_ofs, const void* p_buf, size_t n) {
    assert(p_opaque != nullptr);
    auto* state = reinterpret_cast<ExtractToFileSystemBufferState*>(p_opaque);
    return state->file->Write(p_buf, n, file_ofs);
}

/// Extract an entry to a file
arrow::Result<size_t> Zipper::ExtractEntryToPath(size_t entryID, std::string_view path) {
    if (!current_reader_) return 0;

    // Read file stat
    duckdb_miniz::mz_zip_archive_file_stat stat;
    duckdb_miniz::mz_zip_reader_file_stat(&current_reader_->archive, entryID, &stat);
    auto out = buffer_manager_->OpenFile(path);
    out->Truncate(stat.m_uncomp_size);

    // Extract file
    ExtractToFileSystemBufferState extract_state{*buffer_manager_, out};
    auto ok = duckdb_miniz::mz_zip_reader_extract_to_callback(&current_reader_->archive, entryID,
                                                              &extractToFileSystemBuffer, &extract_state, 0);
    if (!ok) {
        auto error = duckdb_miniz::mz_zip_get_last_error(&current_reader_->archive);
        auto msg = duckdb_miniz::mz_zip_get_error_string(error);
        return arrow::Status{arrow::StatusCode::ExecutionError, std::move(msg)};
    }
    return stat.m_uncomp_size;
}

/// Extract an entry to a file
arrow::Result<size_t> Zipper::ExtractPathToPath(const char* in, std::string_view out) {
    if (!current_reader_) return 0;

    // Locate a file path
    duckdb_miniz::mz_uint32 file_index;
    bool file_exists = duckdb_miniz::mz_zip_reader_locate_file_v2(&current_reader_->archive, in, nullptr,
                                                                  duckdb_miniz::MZ_ZIP_FLAG_IGNORE_PATH, &file_index);
    if (!file_exists) {
        return arrow::Status(arrow::StatusCode::ExecutionError, "File does not exist");
    }

    // Read file stat
    duckdb_miniz::mz_zip_archive_file_stat stat;
    duckdb_miniz::mz_zip_reader_file_stat(&current_reader_->archive, file_index, &stat);
    auto out_file = buffer_manager_->OpenFile(out);
    out_file->Truncate(stat.m_uncomp_size);

    // Extract file
    ExtractToFileSystemBufferState extract_state{*buffer_manager_, out_file};
    auto ok = duckdb_miniz::mz_zip_reader_extract_to_callback(&current_reader_->archive, file_index,
                                                              &extractToFileSystemBuffer, &extract_state, 0);
    if (!ok) {
        auto error = duckdb_miniz::mz_zip_get_last_error(&current_reader_->archive);
        auto msg = duckdb_miniz::mz_zip_get_error_string(error);
        return arrow::Status{arrow::StatusCode::ExecutionError, std::move(msg)};
    }
    return stat.m_uncomp_size;
}

}  // namespace web
}  // namespace duckdb
