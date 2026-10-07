#include "duckdb/web/extension_provider.h"
#include "duckdb/web/main_thread.h"

#include <dlfcn.h>
#include <emscripten.h>

#include "duckdb/common/exception.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/common/string_util.hpp"
#include "duckdb/main/config.hpp"
#include "duckdb/main/database.hpp"
#include "duckdb/main/error_manager.hpp"
#include "duckdb/main/extension.hpp"
#include "duckdb/main/extension_helper.hpp"
#include "duckdb/main/extension_repository_manager.hpp"
#include "duckdb/main/settings.hpp"

namespace duckdb {
namespace web {

namespace {

constexpr const char *EXTENSION_SUFFIX = ".duckdb_extension.wasm";

/// A fetched extension on the wasm heap
struct FetchedExtension {
    char *data = nullptr;
    uint32_t size = 0;

    ~FetchedExtension() { free(data); }
};

/// Fetch an extension synchronously, either through XHR (web workers), or through the file system or a child
/// process (NodeJS). Returns false if the extension could not be fetched.
bool FetchExtension(const string &url, FetchedExtension &out) {
    out.data = reinterpret_cast<char *>(EM_ASM_PTR(
        {
            var url = UTF8ToString($0);
            var bytes;
            try {
                if (typeof XMLHttpRequest === "undefined") {
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        var script =
                            "fetch(process.argv[1]).then(r=>{if(!r.ok)process.exit(2);return r.arrayBuffer()})" +
                            ".then(b=>process.stdout.write(Buffer.from(b)),()=>process.exit(3))";
                        bytes = require("node:child_process").execFileSync(process.execPath, [ "-e", script, url ], {
                            maxBuffer : 1073741824,
                            stdio : [ "ignore", "pipe", "ignore" ]
                        });
                    } else {
                        bytes = require("node:fs").readFileSync(url);
                    }
                } else {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, false);
                    xhr.responseType = "arraybuffer";
                    xhr.send(null);
                    if (xhr.status != 200) return 0;
                    bytes = new Uint8Array(xhr.response);
                }
            } catch (e) {
                return 0;
            }
            var ptr = _malloc(bytes.byteLength);
            HEAPU8.set(bytes, ptr);
            HEAPU32[$1 >> 2] = bytes.byteLength;
            return ptr;
        },
        url.c_str(), &out.size));
    return out.data != nullptr;
}

/// Open a fetched extension as side module. dlopen reads from emscripten's file system.
void *OpenFetchedExtension(const FetchedExtension &extension, const string &path) {
    EM_ASM({ FS.writeFile(UTF8ToString($0), HEAPU8.subarray($1, $1 + $2)); }, path.c_str(), extension.data,
           extension.size);
    auto handle = dlopen(path.c_str(), RTLD_NOW | RTLD_LOCAL);
    EM_ASM({ FS.unlink(UTF8ToString($0)); }, path.c_str());
    return handle;
}

/// The repositories maintained by DuckDB are also served over https, which is required on https sites
string UpgradeToHTTPS(const string &url) {
    const string prefix = "http://";
    if (!StringUtil::StartsWith(url, prefix)) {
        return url;
    }
    auto host = url.substr(prefix.size(), url.find('/', prefix.size()) - prefix.size());
    if (!StringUtil::EndsWith(host, ".duckdb.org")) {
        return url;
    }
    return "https://" + url.substr(prefix.size());
}

}  // namespace

string WasmExtensionProvider::GetName() const { return "wasm"; }

bool WasmExtensionProvider::SupportsExternalExtensions() const { return true; }

bool WasmExtensionProvider::UsesExtensionDirectory() const { return false; }

unique_ptr<ExtensionInstallInfo> WasmExtensionProvider::Install(DatabaseInstance &db, FileSystem &fs,
                                                                const string &local_path, const string &extension,
                                                                ExtensionInstallOptions &options,
                                                                optional_ptr<ClientContext> context) {
    // Nothing is stored, but an explicit repository is remembered for when the extension is loaded
    if (options.repository && !ExtensionHelper::IsFullPath(extension)) {
        auto extension_name = ExtensionHelper::ApplyExtensionAlias(StringUtil::Lower(extension));
        std::lock_guard<std::mutex> guard{mutex_};
        installed_repositories_[extension_name] = *options.repository;
    }
    return nullptr;
}

bool WasmExtensionProvider::TryInitialLoad(DatabaseInstance &db, FileSystem &fs, const string &extension,
                                           const string &repository_name, bool core_only,
                                           ExtensionInitResult &result, string &error) {
    bool direct_load = ExtensionHelper::IsFullPath(extension);
    string extension_name;
    string url;
    ExtensionRepository repository;

    if (direct_load) {
        if (!repository_name.empty()) {
            error = "Cannot combine a FROM repository with a file path";
            return false;
        }
        if (!StringUtil::EndsWith(extension, EXTENSION_SUFFIX)) {
            throw PermissionException(
                "DuckDB-Wasm extensions are files ending with '%s', loading different files is not possible, error "
                "while loading from '%s'",
                EXTENSION_SUFFIX, extension);
        }
        extension_name = ExtensionHelper::GetExtensionName(extension);
        url = extension;
    } else {
        extension_name = ExtensionHelper::ApplyExtensionAlias(StringUtil::Lower(extension));
        if (!repository_name.empty()) {
            // LOAD x FROM repository
            if (!ExtensionRepositoryManager::TryGetRepository(db, fs, repository_name, repository) &&
                !ExtensionRepository::TryGetKnownRepository(repository_name, repository)) {
                error = StringUtil::Format("'%s' is not a known extension repository", repository_name);
                return false;
            }
        } else {
            std::lock_guard<std::mutex> guard{mutex_};
            auto installed = installed_repositories_.find(extension_name);
            if (installed != installed_repositories_.end()) {
                repository = installed->second;
            } else {
                repository = ExtensionHelper::GetAutoinstallRepository(db);
            }
        }
        auto url_template = UpgradeToHTTPS(repository.path) + "/${REVISION}/${PLATFORM}/${NAME}" + EXTENSION_SUFFIX;
        url = ExtensionHelper::ExtensionFinalizeUrlTemplate(url_template, extension_name);
    }

    // The fetch and the load run on the main thread: with pthreads this executes on the query thread, whose
    // JavaScript context (and emscripten file system) is its own, and dlopen is served by the main thread anyway
    FetchedExtension fetched;
    if (!main_thread::OnMainThread([&] { return FetchExtension(url, fetched); })) {
        error = StringUtil::Format("Extension \"%s\" could not be fetched from \"%s\"", extension_name, url);
        return false;
    }
    if (fetched.size < ParsedExtensionMetaData::FOOTER_SIZE) {
        throw InvalidInputException(
            "File '%s' is not a DuckDB extension. Valid DuckDB extensions must be at least %llu bytes", url,
            ParsedExtensionMetaData::FOOTER_SIZE);
    }

    // Parse the extension metadata from the extension binary
    auto parsed_metadata =
        ExtensionHelper::ParseExtensionMetaData(fetched.data + fetched.size - ParsedExtensionMetaData::FOOTER_SIZE);
    auto metadata_mismatch_error = parsed_metadata.GetInvalidMetadataError();
    if (!metadata_mismatch_error.empty()) {
        metadata_mismatch_error = StringUtil::Format("Failed to load '%s', %s", extension, metadata_mismatch_error);
    }

    if (!Settings::Get<AllowUnsignedExtensionsSetting>(db)) {
        // A bare load only trusts the core and community keys, a repository has to be named for its own keys
        bool bare_load = repository_name.empty();
        auto recorded_origin = direct_load ? ExtensionRepositoryType::CORE : repository.type;
        auto trusted_origin = ExtensionHelper::ResolveTrustedSignatureOrigin(!bare_load, core_only, recorded_origin);
        auto signing_repository_name = trusted_origin == recorded_origin ? repository.name : string();

        bool signature_valid = parsed_metadata.AppearsValid() &&
                               ExtensionHelper::CheckExtensionBufferSignature(db, fetched.data, fetched.size,
                                                                              trusted_origin, signing_repository_name);
        if (!metadata_mismatch_error.empty()) {
            throw InvalidInputException(metadata_mismatch_error);
        }
        if (!signature_valid) {
            throw IOException(db.config.error_manager->FormatException(ErrorType::UNSIGNED_EXTENSION, url));
        }
    } else if (!Settings::Get<AllowExtensionsMetadataMismatchSetting>(db)) {
        if (!metadata_mismatch_error.empty()) {
            throw InvalidInputException(metadata_mismatch_error);
        }
    }

    auto lib_hdl = main_thread::OnMainThread([&] { return OpenFetchedExtension(fetched, "/" + extension_name + EXTENSION_SUFFIX); });
    if (!lib_hdl) {
        throw IOException("Extension \"%s\" could not be loaded: %s", url, GetLibraryError());
    }

    result.filebase = extension_name;
    result.filename = url;
    result.lib_hdl = lib_hdl;
    result.abi_type = parsed_metadata.abi_type;
    result.duckdb_capi_version = parsed_metadata.duckdb_capi_version;
    result.install_info = make_uniq<ExtensionInstallInfo>();
    result.install_info->full_path = url;
    result.install_info->version = parsed_metadata.extension_version;
    if (direct_load) {
        result.install_info->mode = ExtensionInstallMode::NOT_INSTALLED;
    } else {
        result.install_info->mode = ExtensionInstallMode::REPOSITORY;
        result.install_info->repository_url = repository.path;
        result.install_info->repository_type = repository.type;
        result.install_info->repository_name = repository.name;
    }
    return true;
}

void *WasmExtensionProvider::OpenLibrary(const string &filename, const string &filebase) {
    throw InternalException("WasmExtensionProvider opens extensions in TryInitialLoad");
}

void *WasmExtensionProvider::TryLoadFunction(void *library, const string &function_name) {
    return dlsym(library, function_name.c_str());
}

string WasmExtensionProvider::GetLibraryError() {
    auto message = dlerror();
    return message ? string(message) : string();
}

}  // namespace web
}  // namespace duckdb
