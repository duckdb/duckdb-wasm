#ifndef INCLUDE_DUCKDB_WEB_EXTENSION_PROVIDER_H_
#define INCLUDE_DUCKDB_WEB_EXTENSION_PROVIDER_H_

#include "duckdb/main/extension/external_extension_provider.hpp"

namespace duckdb {
namespace web {

/// Loads external extensions in DuckDB-Wasm.
/// DuckDB resolves and verifies the extension; this provider fetches its side module and opens it.
class WasmExtensionProvider : public ExternalExtensionProvider {
   public:
    string GetName() const override;
    bool SupportsExternalExtensions() const override;
    void *OpenLibrary(const string &filename, const string &filebase) override;
    void *TryLoadFunction(void *library, const string &function_name) override;
    string GetLibraryError() override;
};

}  // namespace web
}  // namespace duckdb

#endif
