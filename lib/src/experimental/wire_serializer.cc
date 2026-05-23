#include "duckdb/web/experimental/wire_serializer.h"

#include <cstring>

#include "duckdb/common/types.hpp"
#include "duckdb/web/experimental/wire_types.h"

namespace duckdb {
namespace web {
namespace experimental {

// ===== LogicalTypeProperties =====

LogicalTypeProperties LogicalTypeProperties::FromLogicalType(const duckdb::LogicalType& type) {
    LogicalTypeProperties props;
    props.name = type.ToString();
    props.is_numeric = type.IsNumeric();
    props.is_nested = type.IsNested();
    props.is_json = type.IsJSONType();
    props.is_boolean = (type.id() == duckdb::LogicalTypeId::BOOLEAN);
    return props;
}

// ===== Writer =====

void WireSerializer::Writer::WriteUint8(uint8_t val) { buffer.push_back(static_cast<char>(val)); }

void WireSerializer::Writer::WriteUint32(uint32_t val) {
    char buf[4];
    memcpy(buf, &val, 4);
    buffer.append(buf, 4);
}

void WireSerializer::Writer::WriteUint64(uint64_t val) {
    char buf[8];
    memcpy(buf, &val, 8);
    buffer.append(buf, 8);
}

void WireSerializer::Writer::WriteBool(bool val) { WriteUint8(val ? 1 : 0); }

void WireSerializer::Writer::WriteString(const std::string& str) {
    WriteUint32(static_cast<uint32_t>(str.size()));
    buffer.append(str);
}

std::string WireSerializer::Writer::GetResult() const { return buffer; }

// ===== Reader =====

WireSerializer::Reader::Reader(const std::string& blob) : data(blob) {}

uint8_t WireSerializer::Reader::ReadUint8() {
    uint8_t val = static_cast<uint8_t>(data[pos]);
    pos += 1;
    return val;
}

uint32_t WireSerializer::Reader::ReadUint32() {
    uint32_t val;
    memcpy(&val, data.data() + pos, 4);
    pos += 4;
    return val;
}

uint64_t WireSerializer::Reader::ReadUint64() {
    uint64_t val;
    memcpy(&val, data.data() + pos, 8);
    pos += 8;
    return val;
}

bool WireSerializer::Reader::ReadBool() { return ReadUint8() != 0; }

std::string WireSerializer::Reader::ReadString() {
    uint32_t len = ReadUint32();
    std::string result(data.data() + pos, len);
    pos += len;
    return result;
}

// ===== WireResultMetadata =====

std::string WireSerializer::Serialize(const WireResultMetadata& meta) {
    Writer w;
    w.WriteBool(meta.has_error);
    w.WriteString(meta.error_message);
    w.WriteUint8(meta.statement_return_type);
    w.WriteUint8(meta.query_result_type);

    uint32_t ncols = static_cast<uint32_t>(meta.column_names.size());
    w.WriteUint32(ncols);

    for (auto& name : meta.column_names) {
        w.WriteString(name);
    }
    for (auto& type : meta.column_types) {
        w.WriteString(type.name);
        w.WriteBool(type.is_numeric);
        w.WriteBool(type.is_nested);
        w.WriteBool(type.is_json);
        w.WriteBool(type.is_boolean);
    }

    w.WriteUint64(meta.row_count);
    w.WriteUint64(meta.chunk_count);
    w.WriteBool(meta.first_chunk_is_last);
    w.WriteString(meta.first_chunk_blob);

    return w.GetResult();
}

WireResultMetadata WireSerializer::DeserializeResultMetadata(const std::string& blob) {
    Reader r(blob);
    WireResultMetadata meta;
    meta.has_error = r.ReadBool();
    meta.error_message = r.ReadString();
    meta.statement_return_type = r.ReadUint8();
    meta.query_result_type = r.ReadUint8();

    uint32_t ncols = r.ReadUint32();
    meta.column_names.reserve(ncols);
    for (uint32_t i = 0; i < ncols; i++) {
        meta.column_names.push_back(r.ReadString());
    }
    meta.column_types.reserve(ncols);
    for (uint32_t i = 0; i < ncols; i++) {
        LogicalTypeProperties props;
        props.name = r.ReadString();
        props.is_numeric = r.ReadBool();
        props.is_nested = r.ReadBool();
        props.is_json = r.ReadBool();
        props.is_boolean = r.ReadBool();
        meta.column_types.push_back(std::move(props));
    }

    meta.row_count = r.ReadUint64();
    meta.chunk_count = r.ReadUint64();
    meta.first_chunk_is_last = r.ReadBool();
    meta.first_chunk_blob = r.ReadString();

    return meta;
}

// ===== ChunksEnvelope =====

std::string WireSerializer::WriteChunksEnvelope(const ChunksEnvelope& envelope) {
    Writer w;
    w.WriteUint32(static_cast<uint32_t>(envelope.wrappers.size()));
    for (auto& wrapper : envelope.wrappers) {
        w.WriteUint8(static_cast<uint8_t>(wrapper.type));
        switch (wrapper.type) {
            case ChunkWrapperType::EMPTY_CHUNK:
                break;
            case ChunkWrapperType::REGULAR_CHUNK:
                w.WriteString(wrapper.data);
                break;
            case ChunkWrapperType::ERROR:
                w.WriteString(wrapper.error_data);
                break;
            case ChunkWrapperType::FAKE_CHUNK:
                w.WriteBool(wrapper.is_last);
                break;
        }
    }
    return w.GetResult();
}

ChunksEnvelope WireSerializer::ReadChunksEnvelope(const std::string& blob) {
    ChunksEnvelope envelope;
    if (blob.empty()) {
        ChunkWrapper sentinel;
        sentinel.type = ChunkWrapperType::FAKE_CHUNK;
        sentinel.is_last = true;
        envelope.wrappers.push_back(std::move(sentinel));
        return envelope;
    }
    Reader r(blob);
    uint32_t num_wrappers = r.ReadUint32();
    envelope.wrappers.reserve(num_wrappers);
    for (uint32_t i = 0; i < num_wrappers; i++) {
        ChunkWrapper wrapper;
        wrapper.type = static_cast<ChunkWrapperType>(r.ReadUint8());
        switch (wrapper.type) {
            case ChunkWrapperType::EMPTY_CHUNK:
                break;
            case ChunkWrapperType::REGULAR_CHUNK:
                wrapper.data = r.ReadString();
                break;
            case ChunkWrapperType::ERROR:
                wrapper.error_data = r.ReadString();
                break;
            case ChunkWrapperType::FAKE_CHUNK:
                wrapper.is_last = r.ReadBool();
                break;
        }
        envelope.wrappers.push_back(std::move(wrapper));
    }
    return envelope;
}

}  // namespace experimental
}  // namespace web
}  // namespace duckdb
