#ifndef INCLUDE_DUCKDB_WEB_JSON_PARSER_H_
#define INCLUDE_DUCKDB_WEB_JSON_PARSER_H_

#include <memory>

#include "arrow/array/builder_nested.h"
#include "arrow/type.h"
#include "arrow/type_traits.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

// Default json parser flags
constexpr auto DEFAULT_PARSER_FLAGS = rapidjson::kParseDefaultFlags | rapidjson::kParseIterativeFlag |
                                      rapidjson::kParseCommentsFlag | rapidjson::kParseTrailingCommasFlag |
                                      rapidjson::kParseNanAndInfFlag | rapidjson::kParseEscapedApostropheFlag;

/// A type analyzer
class TypeAnalyzer {
   protected:
    /// The exact data type
    std::shared_ptr<arrow::DataType> type_;

    /// Constructor
    TypeAnalyzer(std::shared_ptr<arrow::DataType> type);

   public:
    /// Virtual destructor
    virtual ~TypeAnalyzer() = default;
    /// Get the type
    auto& type() { return type_; }
    /// Check if a value is of the type
    virtual bool TestValue(const rapidjson::Value& json_value) = 0;
    /// Check if multiple values are of the type
    virtual size_t TestValues(const std::vector<rapidjson::Value>& json_values) = 0;

    /// Resolve a type analyzer
    static std::unique_ptr<TypeAnalyzer> ResolveScalar(std::shared_ptr<arrow::DataType> type);
};

/// An array reader
class ArrayParser {
   protected:
    /// The data type
    std::shared_ptr<arrow::DataType> type_;

   public:
    virtual ~ArrayParser() = default;
    /// Get the current length
    size_t GetLength() { return this->builder()->length(); }
    /// Get the array builder
    virtual std::shared_ptr<arrow::ArrayBuilder> builder() = 0;
    /// Initialize the converter
    virtual arrow::Status Init() { return arrow::Status::OK(); }
    /// Append a value
    virtual arrow::Status AppendValue(const rapidjson::Value& json_obj) = 0;
    /// Append multiple values
    virtual arrow::Status AppendValues(const rapidjson::Value& json_array) = 0;
    /// Append a null value
    arrow::Status AppendNull() { return builder()->AppendNull(); }
    /// Finish the conversion
    virtual arrow::Result<std::shared_ptr<arrow::Array>> Finish() {
        auto builder = this->builder();
        if (builder->length() == 0) {
            // Make sure the builder was initialized
            RETURN_NOT_OK(builder->Resize(1));
        }
        return builder->Finish();
    }

    /// Resolve an array parser
    static arrow::Result<std::shared_ptr<ArrayParser>> Resolve(const std::shared_ptr<arrow::DataType>& type);
};

/// A reader event
enum class ReaderEvent {
    NONE,
    KEY,
    NULL_,
    STRING,
    BOOL,
    INT32,
    INT64,
    UINT32,
    UINT64,
    DOUBLE,
    START_OBJECT,
    START_ARRAY,
    END_OBJECT,
    END_ARRAY,
};

/// Get the json reader event name
std::string_view GetReaderEventName(ReaderEvent event);

/// A helper to remember the last JSON event for iterative parsing
struct EventReader : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, EventReader> {
    ReaderEvent event = ReaderEvent::NONE;
    size_t depth = 0;

    bool SetEvent(ReaderEvent e) {
        event = e;
        return true;
    }
    bool Key(const char* txt, size_t length, bool copy) { return SetEvent(ReaderEvent::KEY); }
    bool Null() { return SetEvent(ReaderEvent::NULL_); }
    bool RawNumber(const Ch* str, size_t len, bool copy) { assert(false); }
    bool String(const char* txt, size_t length, bool copy) { return SetEvent(ReaderEvent::STRING); }
    bool Bool(bool v) { return SetEvent(ReaderEvent::BOOL); }
    bool Int(int32_t v) { return SetEvent(ReaderEvent::INT32); }
    bool Int64(int64_t v) { return SetEvent(ReaderEvent::INT64); }
    bool Uint(uint32_t v) { return SetEvent(ReaderEvent::UINT32); }
    bool Uint64(uint64_t v) { return SetEvent(ReaderEvent::UINT64); }
    bool Double(double v) { return SetEvent(ReaderEvent::DOUBLE); }
    bool StartObject() {
        ++depth;
        return SetEvent(ReaderEvent::START_OBJECT);
    }
    bool StartArray() {
        ++depth;
        return SetEvent(ReaderEvent::START_ARRAY);
    }
    bool EndObject(size_t count) {
        --depth;
        return SetEvent(ReaderEvent::END_OBJECT);
    }
    bool EndArray(size_t count) {
        --depth;
        return SetEvent(ReaderEvent::END_ARRAY);
    }
};

/// A helper to remember the last JSON key for iterative parsing
struct KeyReader : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, KeyReader> {
    ReaderEvent event = ReaderEvent::NONE;
    std::string key_buffer = "";
    std::string_view key = "";

    std::string ReleaseKey() {
        if (!key_buffer.empty()) {
            key = {};
            return std::move(key_buffer);
        } else {
            return std::string{std::move(key)};
        }
    }
    bool SetEvent(ReaderEvent e) {
        event = e;
        return true;
    }
    bool Key(const char* txt, size_t length, bool copy) {
        if (copy) {
            key_buffer = std::string{txt, length};
            key = key_buffer;
        } else {
            key_buffer.clear();
            key = std::string_view{txt, length};
        }
        return SetEvent(ReaderEvent::KEY);
    }
    bool Null() { return SetEvent(ReaderEvent::NULL_); }
    bool RawNumber(const Ch* str, size_t len, bool copy) { assert(false); }
    bool String(const char* txt, size_t length, bool copy) { return SetEvent(ReaderEvent::STRING); }
    bool Bool(bool v) { return SetEvent(ReaderEvent::BOOL); }
    bool Int(int32_t v) { return SetEvent(ReaderEvent::INT32); }
    bool Int64(int64_t v) { return SetEvent(ReaderEvent::INT64); }
    bool Uint(uint32_t v) { return SetEvent(ReaderEvent::UINT32); }
    bool Uint64(uint64_t v) { return SetEvent(ReaderEvent::UINT64); }
    bool Double(double v) { return SetEvent(ReaderEvent::DOUBLE); }
    bool StartObject() { return SetEvent(ReaderEvent::START_OBJECT); }
    bool StartArray() { return SetEvent(ReaderEvent::START_ARRAY); }
    bool EndObject(size_t count) { return SetEvent(ReaderEvent::END_OBJECT); }
    bool EndArray(size_t count) { return SetEvent(ReaderEvent::END_ARRAY); }
};

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
