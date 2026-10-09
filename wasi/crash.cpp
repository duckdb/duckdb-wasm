// crash(kind): SQL that misbehaves the way a bug in an extension or in DuckDB itself would, to see what each
// engine does with it. Natively these are a crash of the process; in the sandbox the question is which of them
// trap, and which are silently contained.
#include "crash.hpp"

#include <cstdlib>

#include "duckdb/catalog/catalog.hpp"
#include "duckdb/parser/parsed_data/create_scalar_function_info.hpp"

namespace {

volatile char *volatile sink = nullptr;

int Recurse(int depth) {
    volatile char frame[1024];
    frame[depth % 1024] = static_cast<char>(depth);
    return Recurse(depth + 1) + frame[0];
}

void Crash(int32_t kind) {
    switch (kind) {
        case 0:  // a null dereference: no unmapped page at address 0 in wasm, this is a write to linear memory
            *sink = 1;
            break;
        case 1:  // a wild pointer: unmapped natively, past the end of the linear memory in a 32-bit sandbox
            *reinterpret_cast<volatile char *>(uintptr_t(0xFFFFFFF0)) = 1;
            break;
        case 2:  // a stack overflow
            Recurse(0);
            break;
        case 3:  // an abort
            abort();
        default:
            break;
    }
}

void CrashFunction(duckdb::DataChunk &args, duckdb::ExpressionState &, duckdb::Vector &result) {
    auto kinds = args.data[0].Values<int32_t>();
    auto writer = duckdb::FlatVector::Writer<int32_t>(result, args.size());
    for (auto kind : kinds) {
        if (kind.IsValid()) {
            Crash(kind.GetValue());
        }
        writer.WriteValue(kind.IsValid() ? kind.GetValue() : 0);
    }
}

}  // namespace

void RegisterCrashFunction(duckdb::Connection &con) {
    duckdb::ScalarFunction function("crash", {duckdb::LogicalType::INTEGER}, duckdb::LogicalType::INTEGER,
                                    CrashFunction);
    duckdb::CreateScalarFunctionInfo info(function);
    con.BeginTransaction();
    auto &catalog = duckdb::Catalog::GetSystemCatalog(*con.context);
    catalog.CreateFunction(*con.context, info);
    con.Commit();
}
