#ifndef INCLUDE_DUCKDB_WEB_EXTENSION_PROVIDER_H_
#define INCLUDE_DUCKDB_WEB_EXTENSION_PROVIDER_H_

#include <mutex>
#include <unordered_map>

#include "duckdb/common/file_system.hpp"
#include "duckdb/main/extension/external_extension_provider.hpp"
#include "duckdb/main/extension_install_info.hpp"

namespace duckdb {
namespace web {

/// Loads external extensions in DuckDB-Wasm.
/// DuckDB resolves and verifies the extension; this provider fetches its side module and opens it.
class WasmExtensionProvider : public ExternalExtensionProvider {
   public:
    string GetName() const override;
    bool SupportsExternalExtensions() const override;
    unique_ptr<ExtensionInstallInfo> Install(DatabaseInstance &db, FileSystem &fs, const string &local_path,
                                             const string &extension, ExtensionInstallOptions &options,
                                             optional_ptr<ClientContext> context) override;
    void RegisterAutoloadableExtensions(DatabaseInstance &db, FileSystem &fs);
    void *OpenLibrary(const string &filename, const string &filebase) override;
    void *TryLoadFunction(void *library, const string &function_name) override;
    string GetLibraryError() override;

   private:
    struct InstalledExtension {
        FileSystem *file_system = nullptr;
        unique_ptr<FileHandle> extension_pin;
        unique_ptr<FileHandle> info_pin;
    };

    std::mutex mutex_;
    std::unordered_map<string, InstalledExtension> installed_extensions_;
};

}  // namespace web
}  // namespace duckdb

#endif
