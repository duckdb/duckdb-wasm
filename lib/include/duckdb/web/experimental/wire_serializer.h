#ifndef INCLUDE_DUCKDB_WEB_EXPERIMENTAL_WIRE_SERIALIZER_H_
#define INCLUDE_DUCKDB_WEB_EXPERIMENTAL_WIRE_SERIALIZER_H_

#include "duckdb/web/experimental/wire_types.h"
#include <string>

namespace duckdb {
namespace web {
namespace experimental {

//! Simple binary serialization for wire protocol types.
class WireSerializer {
   public:
    static std::string Serialize(const WireResultMetadata& meta);
    static WireResultMetadata DeserializeResultMetadata(const std::string& blob);

    static std::string WriteChunksEnvelope(const ChunksEnvelope& envelope);
    static ChunksEnvelope ReadChunksEnvelope(const std::string& blob);

   private:
    class Writer {
       public:
        void WriteUint8(uint8_t val);
        void WriteUint32(uint32_t val);
        void WriteUint64(uint64_t val);
        void WriteBool(bool val);
        void WriteString(const std::string& str);
        std::string GetResult() const;

       private:
        std::string buffer;
    };

    class Reader {
       public:
        explicit Reader(const std::string& blob);
        uint8_t ReadUint8();
        uint32_t ReadUint32();
        uint64_t ReadUint64();
        bool ReadBool();
        std::string ReadString();

       private:
        const std::string& data;
        size_t pos = 0;
    };
};

}  // namespace experimental
}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_EXPERIMENTAL_WIRE_SERIALIZER_H_
