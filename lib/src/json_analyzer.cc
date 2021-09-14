#include "duckdb/web/json_analyzer.h"

#include <iostream>

#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type_fwd.h"
#include "duckdb/web/json_parser.h"
#include "duckdb/web/utils/reservoir_sample.h"
#include "rapidjson/error/en.h"
#include "rapidjson/istreamwrapper.h"

namespace duckdb {
namespace web {
namespace json {

namespace {

/// Statistics about a JSON array.
/// We use this to detect number and boolean types without a sample.
struct JSONArrayStats {
    size_t counter_bool = 0;
    size_t counter_string = 0;
    size_t counter_int32 = 0;
    size_t counter_int64 = 0;
    size_t counter_uint32 = 0;
    size_t counter_uint32_max = 0;
    size_t counter_uint64 = 0;
    size_t counter_uint64_max = 0;
    size_t counter_double = 0;
    size_t counter_object = 0;
    size_t counter_array = 0;
};

/// Infer a data type from a json value
std::shared_ptr<arrow::DataType> InferDataTypeImpl(const rapidjson::Value& value) {
    switch (value.GetType()) {
        case rapidjson::Type::kArrayType: {
            auto array = value.GetArray();
            auto step = array.Size() / 20;
            std::shared_ptr<arrow::DataType> type = nullptr;
            for (int i = 0; i < array.Size(); ++i) {
                if (array[i].IsNull()) continue;
                return arrow::list(InferDataTypeImpl(array[i]));
            }
            return arrow::utf8();
        }
        case rapidjson::Type::kObjectType: {
            std::vector<std::shared_ptr<arrow::Field>> fields;
            for (auto iter = value.MemberBegin(); iter != value.MemberEnd(); ++iter) {
                auto type = InferDataTypeImpl(iter->value);
                fields.push_back(arrow::field(iter->name.GetString(), std::move(type)));
                std::sort(fields.begin(), fields.end(), [&](auto& l, auto& r) { return l->name() < r->name(); });
            }
            return arrow::struct_(std::move(fields));
        }
        case rapidjson::Type::kNumberType:
            return arrow::float64();
        case rapidjson::Type::kStringType:
            return arrow::utf8();
        case rapidjson::Type::kNullType:
            return arrow::null();
        case rapidjson::Type::kFalseType:
        case rapidjson::Type::kTrueType:
            return arrow::boolean();
    }
    return arrow::null();
}

/// Get the preference for a certain string type.
static size_t getTypePreference(arrow::Type::type id) {
    switch (id) {
#define PREFER_CASE(TYPE, SCORE) \
    case TYPE:                   \
        return SCORE;
        PREFER_CASE(arrow::Type::TIMESTAMP, 100)
        PREFER_CASE(arrow::Type::INT32, 40)
        PREFER_CASE(arrow::Type::UINT32, 39)
        PREFER_CASE(arrow::Type::INT64, 38)
        PREFER_CASE(arrow::Type::UINT64, 37)
        PREFER_CASE(arrow::Type::DOUBLE, 20)
        PREFER_CASE(arrow::Type::BOOL, 10)
        PREFER_CASE(arrow::Type::STRING, 1)
#undef PREFER
        default:
            assert(false && "unexpected type");
            return 0;
    };
}

/// Infer data type from hit counts
static std::shared_ptr<arrow::DataType> InferDataTypeImpl(
    std::vector<std::pair<std::shared_ptr<arrow::DataType>, size_t>>& hits) {
    if (hits.empty()) return arrow::null();

    // for (auto& [type, hits] : hits) {
    //     std::cout << type->ToString() << ": " << hits << std::endl;
    // }

    // Determine hit rate of best match
    std::sort(hits.begin(), hits.end(), [&](auto& l, auto& r) { return l.second < r.second; });
    auto best = hits.back().second;

    // Filter everything that scores at same as the best match
    auto lb =
        std::lower_bound(hits.begin(), hits.end(), best, [&](auto& e, auto threshold) { return e.second < threshold; });
    assert(lb < hits.end());  // At least the best match

    // Sort the best matches by type preference
    std::sort(lb, hits.end(),
              [&](auto& l, auto& r) { return getTypePreference(l.first->id()) < getTypePreference(r.first->id()); });
    return hits.back().first;
}

/// Infer a data type from statistics and a sample
arrow::Result<std::shared_ptr<arrow::DataType>> InferDataTypeImpl(const JSONArrayStats& stats,
                                                                  const std::vector<rapidjson::Value>& samples) {
    // Check what we're up to
    auto any_i32 = stats.counter_int32 > 0 || stats.counter_uint32 > 0;
    auto any_i64 = stats.counter_int64 > 0 || stats.counter_uint64 > 0;

    // Objects and arrays win over everything
    if (stats.counter_object > 0 || stats.counter_array > 0) {
        std::vector<std::shared_ptr<arrow::DataType>> sample_types;
        sample_types.reserve(samples.size());
        for (auto& sample : samples) {
            auto type = InferDataTypeImpl(sample);
            if (!type) continue;
            sample_types.push_back(std::move(type));
        }
        std::sort(sample_types.begin(), sample_types.end(),
                  [&](auto& l, auto& r) { return l->fingerprint() < r->fingerprint(); });
        return !sample_types.empty() ? sample_types[sample_types.size() >> 1] : arrow::null();
    }
    // Strings win over numbers
    if (stats.counter_string > 0) {
        // TODO: what about decimals? we could try a few scales
        std::vector<std::pair<std::shared_ptr<arrow::DataType>, size_t>> candidates{
            {arrow::timestamp(arrow::TimeUnit::SECOND), 0},
            {arrow::int32(), 0},
            {arrow::uint32(), 0},
            {arrow::int64(), 0},
            {arrow::uint64(), 0},
            {arrow::float64(), 0},
            {arrow::boolean(), 0},
            {arrow::utf8(), 0}};
        for (auto& [type, hits] : candidates) {
            hits = TypeAnalyzer::ResolveScalar(type)->TestValues(samples);
        }
        return InferDataTypeImpl(candidates);
    }
    // Doubles win over integers
    if (stats.counter_double > 0) {
        return arrow::float64();
    }
    // Forced into 64 bit unsigned?
    if (stats.counter_uint64_max > 0) {
        if (stats.counter_int64 > 0 || stats.counter_int32 > 0) {
            // Conflict, we'll just silently fall back to doubles.
            // We could tell the user.
            return arrow::float64();
        }
        return arrow::uint64();
    }
    // Forced into 64 bit?
    if (any_i64 || (stats.counter_int32 > 0 && stats.counter_uint32_max > 0)) return arrow::int64();
    // Forced into 32 bit unsigned?
    if (stats.counter_uint32_max > 0) return arrow::uint32();
    // Just 32 bit signed?
    if (any_i32) return arrow::int32();
    // Boolean?
    if (stats.counter_bool > 0) return arrow::boolean();
    // Everything must be null then?
    return arrow::null();
}

/// Infer a data type from statistics and a sample
arrow::Result<std::shared_ptr<arrow::DataType>> InferDataTypeImpl(
    std::unordered_map<std::string_view, JSONArrayStats>& field_stats, const std::vector<rapidjson::Value>& samples) {
    std::vector<std::shared_ptr<arrow::Field>> fields;

    // The pending object fields
    std::unordered_map<std::string_view, std::vector<std::shared_ptr<arrow::DataType>>> infer_directly;
    // The string field options
    std::vector<std::unique_ptr<TypeAnalyzer>> analyzers;
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::timestamp(arrow::TimeUnit::SECOND)));
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::int32()));
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::uint32()));
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::int64()));
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::uint64()));
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::float64()));
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::boolean()));
    analyzers.push_back(TypeAnalyzer::ResolveScalar(arrow::utf8()));
    // The pending string fields
    std::unordered_map<std::string_view, std::vector<size_t>> infer_from_analyzers;

    for (auto& [name, stats] : field_stats) {
        // Check what we're up to
        auto any_i32 = stats.counter_int32 > 0 || stats.counter_uint32 > 0;
        auto any_i64 = stats.counter_int64 > 0 || stats.counter_uint64 > 0;

        // Objects and arrays win over everything
        if (stats.counter_object > 0 || stats.counter_array > 0) {
            std::vector<std::shared_ptr<arrow::DataType>> types;
            types.reserve(samples.size());
            infer_directly.insert({name, std::move(types)});
            continue;
        }
        // Strings win over numbers
        if (stats.counter_string > 0) {
            std::vector<size_t> hits;
            hits.resize(analyzers.size());
            infer_from_analyzers.insert({name, std::move(hits)});
            continue;
        }
        // Doubles win over integers
        if (stats.counter_double > 0) {
            fields.push_back(arrow::field(std::string{name}, arrow::float64()));
            continue;
        }
        // Forced into 64 bit unsigned?
        if (stats.counter_uint64_max > 0) {
            if (stats.counter_int64 > 0 || stats.counter_int32 > 0) {
                // Conflict, we'll just silently fall back to doubles.
                // We could tell the user.
                fields.push_back(arrow::field(std::string{name}, arrow::float64()));
                continue;
            }
            fields.push_back(arrow::field(std::string{name}, arrow::uint64()));
            continue;
        }
        // Forced into 64 bit?
        if (any_i64 || (stats.counter_int32 > 0 && stats.counter_uint32_max > 0)) {
            fields.push_back(arrow::field(std::string{name}, arrow::uint64()));
            continue;
        }
        // Forced into 32 bit unsigned?
        if (stats.counter_uint32_max > 0) {
            fields.push_back(arrow::field(std::string{name}, arrow::uint32()));
            continue;
        }
        // Just 32 bit signed?
        if (any_i32) {
            fields.push_back(arrow::field(std::string{name}, arrow::int32()));
            continue;
        }
        // Boolean?
        if (stats.counter_bool > 0) {
            fields.push_back(arrow::field(std::string{name}, arrow::boolean()));
            continue;
        }
        // Everything must be null then?
        fields.push_back(arrow::field(std::string{name}, arrow::null()));
    }

    // Need to check the sample?
    if (!infer_directly.empty() || !infer_from_analyzers.empty()) {
        // Analyze the sample first
        for (auto& sample : samples) {
            for (auto iter = sample.MemberBegin(); iter != sample.MemberEnd(); ++iter) {
                auto name_str = iter->name.GetString();
                // Directly?
                if (auto o = infer_directly.find(name_str); o != infer_directly.end()) {
                    o->second.push_back(InferDataTypeImpl(iter->value));
                    continue;
                }
                // From analyzers?
                if (auto s = infer_from_analyzers.find(name_str); s != infer_from_analyzers.end()) {
                    for (unsigned i = 0; i < s->second.size(); ++i) {
                        s->second[i] += analyzers[i]->TestValue(iter->value);
                    }
                    continue;
                }
            }
        }

        // Infer directly
        for (auto& [name, types] : infer_directly) {
            std::sort(types.begin(), types.end(),
                      [&](auto& l, auto& r) { return l->fingerprint() < r->fingerprint(); });
            auto type = !types.empty() ? types[types.size() >> 1] : arrow::null();
            fields.push_back(arrow::field(std::string(name), type));
        }

        // Infer from analyzer hits
        for (auto& [name, hits] : infer_from_analyzers) {
            std::vector<std::pair<std::shared_ptr<arrow::DataType>, size_t>> candidates;
            candidates.reserve(hits.size());
            for (unsigned i = 0; i < hits.size(); ++i) {
                candidates.push_back({analyzers[i]->type(), hits[i]});
            }
            fields.push_back(arrow::field(std::string(name), InferDataTypeImpl(candidates)));
        }
    }
    std::sort(fields.begin(), fields.end(), [&](auto& l, auto& r) { return l->name() < r->name(); });
    return arrow::struct_(std::move(fields));
}

/// Type detection base class
template <TableShape SHAPE, typename DERIVED>
class JSONArrayAnalyzer : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, DERIVED> {
   protected:
    /// The nesting depth at which the actual data can be found.
    /// E.g. In row arrays, attributes are nested in objects that are nested in the top level array.
    static constexpr size_t data_depth_ = SHAPE == ROW_ARRAY ? 2 : 1;
    /// The nesting depth at which we sample for objects for type inference.
    /// Both, rows and columns sample the children of the given top-level array.
    static constexpr size_t sample_depth_ = 1;
    /// The current depth.
    /// We already consume the start of the array and let the analyzer do the rest.
    size_t current_depth_ = 1;

    /// The current stats
    JSONArrayStats* stats_ = nullptr;

    /// The sample buffer
    rapidjson::Document sample_buffer_ = {};
    /// The rapidjson array
    std::vector<rapidjson::Value> sample_ = {};
    /// Skip the current array entry?
    std::optional<size_t> sample_idx_ = std::nullopt;
    /// The reservoir counter
    ReservoirSampleCounter sample_counter_ = {};

    /// CRTP Impl
    auto& Impl() { return reinterpret_cast<DERIVED&>(*this); }

    // Bump a counter
#define BUMP(COUNTER) \
    if (current_depth_ == data_depth_) ++stats_->COUNTER;
#define BUMP_IF(COUNTER, COND) \
    if (current_depth_ == data_depth_ && COND) ++stats_->COUNTER;

    /// Add an element to the sample
    inline bool Emit(bool ok) {
        if (current_depth_ > sample_depth_ || !ok) return ok;
        auto gen = [](auto&) { return true; };
        if (*sample_idx_ == sample_.size()) {
            sample_.push_back(std::move(sample_buffer_.Populate(gen).Move()));
        } else {
            assert(*sample_idx_ < sample_.size());
            sample_[*sample_idx_] = std::move(sample_buffer_.Populate(gen).Move());
        }
        sample_buffer_.SetNull();
        sample_idx_.reset();
        return ok;
    }

   public:
    /// Saw the closing array event?
    bool Done() { return current_depth_ == 0; }

    /// Add a key
    bool Key(const char* txt, size_t length, bool copy) {
        return sample_idx_ ? sample_buffer_.Key(txt, length, copy) : true;
    }
    bool Null() { return sample_idx_ ? Emit(sample_buffer_.Null()) : true; }
    bool RawNumber(const char* str, size_t len, bool copy) {
        assert(false);
        return false;
    }
    bool String(const char* txt, size_t length, bool copy) {
        BUMP(counter_string);
        if (current_depth_ == sample_depth_) sample_idx_ = sample_counter_.Insert();
        return sample_idx_ ? Emit(sample_buffer_.String(txt, length, copy)) : true;
    }
    bool Bool(bool v) {
        BUMP(counter_bool);
        return sample_idx_ ? Emit(sample_buffer_.Bool(v)) : true;
    }
    bool Int(int32_t v) {
        BUMP(counter_int32);
        return sample_idx_ ? Emit(sample_buffer_.Int(v)) : true;
    }
    bool Int64(int64_t v) {
        BUMP(counter_int64);
        return sample_idx_ ? Emit(sample_buffer_.Int64(v)) : true;
    }
    bool Uint(uint32_t v) {
        BUMP(counter_uint32);
        BUMP_IF(counter_uint32_max, v >= std::numeric_limits<int32_t>::max());
        return sample_idx_ ? Emit(sample_buffer_.Uint(v)) : true;
    }
    bool Uint64(uint64_t v) {
        BUMP(counter_uint64);
        BUMP_IF(counter_uint64_max, v >= std::numeric_limits<int64_t>::max());
        return sample_idx_ ? Emit(sample_buffer_.Uint64(v)) : true;
    }
    bool Double(double v) {
        BUMP(counter_double);
        return sample_idx_ ? Emit(sample_buffer_.Double(v)) : true;
    }
    bool StartObject() {
        BUMP(counter_object);
        if (current_depth_++ == sample_depth_) sample_idx_ = sample_counter_.Insert();
        if (sample_idx_) return sample_buffer_.StartObject();
        return true;
    }
    bool StartArray() {
        BUMP(counter_array);
        if (current_depth_++ == sample_depth_) sample_idx_ = sample_counter_.Insert();
        if (sample_idx_) return sample_buffer_.StartObject();
        return true;
    }
    bool EndObject(size_t count) {
        assert(current_depth_ > 0);
        assert(!sample_idx_.has_value() || current_depth_ > sample_depth_);
        --current_depth_;
        if constexpr (SHAPE == ROW_ARRAY) stats_ = nullptr;
        return sample_idx_ ? Emit(sample_buffer_.EndObject(count)) : true;
    }
    bool EndArray(size_t count) {
        assert(current_depth_ > 0);
        assert(!sample_idx_.has_value() || current_depth_ > sample_depth_);
        --current_depth_;
        if constexpr (SHAPE == ROW_ARRAY) stats_ = nullptr;
        return sample_idx_ ? Emit(sample_buffer_.EndArray(count)) : true;
    }

#undef BUMP
#undef BUMP_IF
};

/// Type detection helper for flat json arrays.
/// E.g. [1,2,3] => list(int32())
/// Nested types are only inferred based on a reservoir sample.
///
/// Assumes to see 1 additional unmatched array event after which Done() will return true.
struct JSONFlatArrayAnalyzer : public JSONArrayAnalyzer<TableShape::COLUMN_OBJECT, JSONFlatArrayAnalyzer> {
    /// The top level stats
    JSONArrayStats root_stats_ = {};

    /// Constructor
    JSONFlatArrayAnalyzer(size_t capacity = 1024) {
        stats_ = &root_stats_;
        sample_.reserve(capacity);
    }
    /// Infer the array type
    arrow::Result<std::shared_ptr<arrow::DataType>> InferDataType() { return InferDataTypeImpl(root_stats_, sample_); }
};

/// Type detection helper for json struct arrays.
/// E.g. [{"a": 1},{"b": 2},{"a": 3}] => list(struct_(field("a", int32()), field("b", int32())))
/// Collects statistics about the first nesting level rather then the root.
/// Deeper nesting levels are again inferred from a sample.
///
/// Assumes to see 1 additional unmatched array event after which Done() will return true.
class JSONStructArrayAnalyzer : public JSONArrayAnalyzer<TableShape::ROW_ARRAY, JSONStructArrayAnalyzer> {
   protected:
    /// The first-level field limit
    size_t field_limit = 100;
    /// The first-level fields
    std::vector<std::unique_ptr<char[]>> field_names_ = {};
    /// The first-level stats
    std::unordered_map<std::string_view, JSONArrayStats> field_stats_ = {};

   public:
    /// Constructor
    JSONStructArrayAnalyzer(size_t capacity = 1024) { sample_.reserve(capacity); }

    /// Add a key
    bool Key(const char* txt, size_t length, bool copy) {
        // When encountering a key at level 1, we resolve the corresponding array statistics.
        // E.g. [{"a": 1, "b": 2}, {"a": 3, "b": 4}]
        //      => tracks array statistics for "a" and "b" as opposed to []
        if (current_depth_ == data_depth_) {
            if (auto iter = field_stats_.find(std::string_view{txt, length}); iter != field_stats_.end()) {
                stats_ = &iter->second;
            } else if (field_names_.size() < field_limit) {
                // Allocate name buffer
                std::unique_ptr<char[]> buffer(new char[length + 1]);
                std::memcpy(buffer.get(), txt, length);
                *(buffer.get() + length) = 0;
                auto name = std::string_view{buffer.get(), length};

                // Create array stats
                auto [iter, ok] = field_stats_.insert({name, JSONArrayStats{}});
                assert(ok);
                stats_ = &iter->second;
                field_names_.push_back(std::move(buffer));
            }
        }
        return sample_idx_ ? sample_buffer_.Key(txt, length, copy) : true;
    }

    /// Infer the array type
    arrow::Result<std::shared_ptr<arrow::DataType>> InferDataType() { return InferDataTypeImpl(field_stats_, sample_); }
};

}  // namespace

arrow::Status InferTableType(std::istream& raw_in, TableType& table) {
    rapidjson::IStreamWrapper in{raw_in};

    // Parse the SAX document
    rapidjson::Reader reader;
    reader.IterativeParseInit();

    // Peek into the document
    KeyReader cache;
    if (!reader.IterativeParseNext<DEFAULT_PARSER_FLAGS>(in, cache)) {
        auto error = rapidjson::GetParseError_En(reader.GetParseErrorCode());
        return arrow::Status(arrow::StatusCode::ExecutionError, error);
    }

    // Assume row-major layout.
    // E.g. [{"a":1,"b":2}, {"a":3,"b":4}]
    if (cache.event == ReaderEvent::START_ARRAY) {
        // Parse all rows
        JSONStructArrayAnalyzer analyzer;
        while (!reader.IterativeParseComplete()) {
            if (!reader.IterativeParseNext<DEFAULT_PARSER_FLAGS>(in, analyzer)) {
                auto error = rapidjson::GetParseError_En(reader.GetParseErrorCode());
                return arrow::Status(arrow::StatusCode::ExecutionError, error);
            }
        }
        assert(analyzer.Done());

        // Infer the struct type
        ARROW_ASSIGN_OR_RAISE(table.type, analyzer.InferDataType());
        table.shape = TableShape::ROW_ARRAY;
        return arrow::Status::OK();
    }

    // Assume column-major layout.
    // E.g. {"a":[1,3],"b":[2,4]}
    if (cache.event == ReaderEvent::START_OBJECT) {
        auto next = [&]() { return reader.IterativeParseNext<DEFAULT_PARSER_FLAGS>(in, cache); };
        std::vector<std::shared_ptr<arrow::Field>> fields;

        // Parse columns individually
        while (next() && cache.event == ReaderEvent::KEY) {
            auto column_name = cache.ReleaseKey();

            // Key followed by something other than an array?
            // That violates the assumption that we have a column-major layout.
            // We failed and give up.
            if (!next() || cache.event != ReaderEvent::START_ARRAY) {
                table.shape = TableShape::UNRECOGNIZED;
                return arrow::Status::OK();
            }

            // Get the begin of the column
            auto column_begin = in.Tell() - 1;
            auto column_end = column_begin;

            // Parse entire column array.
            JSONFlatArrayAnalyzer analyzer;
            while (!reader.IterativeParseComplete() && !analyzer.Done()) {
                if (!reader.IterativeParseNext<DEFAULT_PARSER_FLAGS>(in, analyzer)) {
                    auto error = rapidjson::GetParseError_En(reader.GetParseErrorCode());
                    return arrow::Status(arrow::StatusCode::ExecutionError, error);
                }
            }
            assert(analyzer.Done());

            // Detect column type
            ARROW_ASSIGN_OR_RAISE(auto column_type, analyzer.InferDataType());
            fields.push_back(arrow::field(column_name, column_type));

            // Store column range
            column_end = in.Tell();
            table.column_boundaries.insert(
                {column_name, FileRange{.offset = column_begin, .size = column_end - column_begin}});
        }
        std::sort(fields.begin(), fields.end(), [&](auto& l, auto& r) { return l->name() < r->name(); });
        table.shape = TableShape::COLUMN_OBJECT;
        table.type = arrow::struct_(std::move(fields));
        return arrow::Status::OK();
    }

    // Unknown structure
    table.shape = TableShape::UNRECOGNIZED;
    return arrow::Status::OK();
}

/// Find column boundaries
arrow::Status FindColumnBoundaries(std::istream& in, TableType& type) {
    // Dont spend time on parsing numbers
    constexpr auto SCAN_FLAGS = DEFAULT_PARSER_FLAGS | rapidjson::kParseNumbersAsStringsFlag;

    // Setup parser
    rapidjson::IStreamWrapper in_wrapper{in};
    rapidjson::Reader reader;
    reader.IterativeParseInit();

    // Consume top-level object
    EventReader event_reader;
    if (!reader.IterativeParseNext<SCAN_FLAGS>(in_wrapper, event_reader)) {
        auto error = rapidjson::GetParseError_En(reader.GetParseErrorCode());
        return arrow::Status::Invalid(error);
    }
    if (event_reader.event != ReaderEvent::START_OBJECT) {
        return arrow::Status::Invalid("Unexpected top-level JSON type");
    }

    // Scan all column arrays
    KeyReader key_reader;
    auto next_event = [&]() { return reader.IterativeParseNext<SCAN_FLAGS>(in_wrapper, event_reader); };
    auto next_key = [&]() { return reader.IterativeParseNext<SCAN_FLAGS>(in_wrapper, key_reader); };
    while (next_key() && key_reader.event == ReaderEvent::KEY) {
        auto column_name = key_reader.ReleaseKey();

        // Get the column
        if (!next_event() || event_reader.event != ReaderEvent::START_ARRAY) {
            return arrow::Status::Invalid("Invalid type. Expected start of column array, received: ",
                                          GetReaderEventName(event_reader.event));
        }

        // Get the begin of the column
        auto column_begin = in_wrapper.Tell() - 1;
        auto column_end = column_begin;

        // Consume the entire column array.
        // XXX this is the hot loop since we're scanning the entire document for the column boundaries.
        // XXX parser errors.
        assert(event_reader.depth == 2);
        while (next_event() && event_reader.depth != 1)
            ;

        // The the position of the first token that is different
        column_end = in_wrapper.Tell();

        // Insert column boundaries
        type.column_boundaries.insert(
            {column_name, FileRange{.offset = column_begin, .size = column_end - column_begin}});
    }
    return arrow::Status::OK();
}

}  // namespace json
}  // namespace web
}  // namespace duckdb
