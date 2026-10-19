#include "duckdb/web/extension_provider.h"

#include <dlfcn.h>
#include <emscripten.h>

#include "duckdb/common/exception.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/common/serializer/binary_serializer.hpp"
#include "duckdb/common/serializer/memory_stream.hpp"
#include "duckdb/common/string_util.hpp"
#include "duckdb/main/config.hpp"
#include "duckdb/main/database.hpp"
#include "duckdb/main/error_manager.hpp"
#include "duckdb/main/extension.hpp"
#include "duckdb/main/extension_entries.hpp"
#include "duckdb/main/extension_helper.hpp"
#include "duckdb/main/extension_repository_manager.hpp"
#include "duckdb/main/settings.hpp"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/main_thread.h"

namespace duckdb {
namespace web {

namespace {

constexpr const char* EXTENSION_SUFFIX = ".duckdb_extension.wasm";

/// A fetched extension on the wasm heap
struct FetchedExtension {
    char* data = nullptr;
    uint32_t size = 0;

    ~FetchedExtension() { free(data); }
};

/// Fetch an extension synchronously, either through XHR (web workers), or through the file system or a child
/// process (NodeJS). Returns false if the extension could not be fetched.
bool FetchExtension(const string& url, FetchedExtension& out) {
    // clang-format off
    out.data = reinterpret_cast<char*>(EM_ASM_PTR(
        {
            var url = UTF8ToString($0);
            var bytes;
            try {
                if (typeof XMLHttpRequest === "undefined") {
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        var script =
                            "fetch(process.argv[1]).then(r=>{if(!r.ok)process.exit(2);return r.arrayBuffer()})" +
                            ".then(b=>process.stdout.write(Buffer.from(b)),()=>process.exit(3))";
                        bytes = require("node:child_process").execFileSync(process.execPath, ["-e", script, url], {
                            maxBuffer: 1073741824,
                            stdio: ["ignore", "pipe", "ignore"]
                        });
                    } else {
                        bytes = require("node:fs").readFileSync(url);
                    }
                } else if (typeof document === "undefined") {
                    // A worker: a synchronous request with a binary response
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, false);
                    xhr.responseType = "arraybuffer";
                    xhr.send(null);
                    if (xhr.status != 200) return 0;
                    bytes = new Uint8Array(xhr.response);
                } else {
                    // The main thread of a page (blocking bindings) refuses a synchronous request with a binary
                    // response type: the bytes come as a text of code points below 256
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, false);
                    xhr.overrideMimeType("text/plain; charset=x-user-defined");
                    xhr.send(null);
                    if (xhr.status != 200) return 0;
                    var text = xhr.responseText;
                    bytes = new Uint8Array(text.length);
                    for (var i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
                }
            } catch (e) {
                return 0;
            }
            var ptr = _malloc(bytes.byteLength) >>> 0;
            HEAPU8.set(bytes, ptr);
            HEAPU32[$1 >>> 2] = bytes.byteLength;
            return ptr;
        },
        url.c_str(), &out.size));
    // clang-format on
    return out.data != nullptr;
}

/// Open a fetched extension as side module. dlopen reads from emscripten's file system.
void* OpenFetchedExtension(const FetchedExtension& extension, const string& path) {
    // clang-format off
    EM_ASM({ FS.writeFile(UTF8ToString($0), HEAPU8.subarray($1, $1 + $2)); }, path.c_str(), extension.data, extension.size);
    // clang-format on
    auto handle = dlopen(path.c_str(), RTLD_NOW | RTLD_LOCAL);
    // clang-format off
    EM_ASM({ FS.unlink(UTF8ToString($0)); }, path.c_str());
    // clang-format on
    return handle;
}

/// The repositories maintained by DuckDB are also served over HTTPS, which is required on HTTPS sites.
string UpgradeToHTTPS(const string& url) {
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

string ExtensionURL(const ExtensionRepository& repository, const string& extension_name, const string& version = {}) {
    auto version_path = version.empty() ? string() : "/" + extension_name + "/" + version;
    auto url_template =
        UpgradeToHTTPS(repository.path) + version_path + "/${REVISION}/${PLATFORM}/${NAME}" + EXTENSION_SUFFIX;
    return ExtensionHelper::ExtensionFinalizeUrlTemplate(url_template, extension_name);
}

}  // namespace

string WasmExtensionProvider::GetName() const { return "wasm"; }

bool WasmExtensionProvider::SupportsExternalExtensions() const { return true; }

unique_ptr<ExtensionInstallInfo> WasmExtensionProvider::Install(DatabaseInstance& db, FileSystem& fs,
                                                                const string& local_path, const string& extension,
                                                                ExtensionInstallOptions& options,
                                                                optional_ptr<ClientContext> context) {
    auto direct_install = ExtensionHelper::IsFullPath(extension);
    auto extension_name = ExtensionHelper::GetExtensionName(extension);
    ExtensionRepository repository;
    string url;

    if (direct_install) {
        url = extension;
    } else {
        repository = options.repository ? *options.repository : ExtensionHelper::GetAutoinstallRepository(db);
        url = ExtensionURL(repository, extension_name, options.version);
    }

    FetchedExtension fetched;
    if (!main_thread::OnMainThread([&] { return FetchExtension(url, fetched); })) {
        throw IOException("Extension \"%s\" could not be fetched from \"%s\"", extension_name, url);
    }
    if (fetched.size < ParsedExtensionMetaData::FOOTER_SIZE) {
        throw InvalidInputException(
            "File '%s' is not a DuckDB extension. Valid DuckDB extensions must be at least %llu bytes", url,
            ParsedExtensionMetaData::FOOTER_SIZE);
    }

    auto parsed_metadata =
        ExtensionHelper::ParseExtensionMetaData(fetched.data + fetched.size - ParsedExtensionMetaData::FOOTER_SIZE);
    auto metadata_mismatch_error = parsed_metadata.GetInvalidMetadataError();
    if (!metadata_mismatch_error.empty() && !Settings::Get<AllowExtensionsMetadataMismatchSetting>(db)) {
        throw InvalidInputException("Failed to install '%s', %s", extension_name, metadata_mismatch_error);
    }

    auto install_info = make_uniq<ExtensionInstallInfo>();
    install_info->full_path = url;
    install_info->version = parsed_metadata.extension_version;
    if (direct_install) {
        install_info->mode = ExtensionInstallMode::CUSTOM_PATH;
    } else {
        install_info->mode = ExtensionInstallMode::REPOSITORY;
        install_info->repository_url = repository.path;
        install_info->repository_type = repository.type;
        install_info->repository_name = repository.name;
    }

    if (!Settings::Get<AllowUnsignedExtensionsSetting>(db)) {
        auto signature_valid = ExtensionHelper::CheckExtensionBufferSignature(
            db, fetched.data, fetched.size, install_info->repository_type, install_info->repository_name,
            &install_info->signature_key_fingerprint);
        if (!signature_valid) {
            throw IOException(db.config.error_manager->FormatException(ErrorType::UNSIGNED_EXTENSION, url));
        }
    }

    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) {
        throw InternalException("WebFileSystem is not configured");
    }

    auto local_file = fs.JoinPath(local_path, extension_name + ".duckdb_extension");
    auto extension_buffer = std::make_unique<char[]>(fetched.size);
    memcpy(extension_buffer.get(), fetched.data, fetched.size);
    auto registered_extension = web_fs->RegisterFileBuffer(
        local_file, io::WebFileSystem::DataBuffer(std::move(extension_buffer), fetched.size));
    if (!registered_extension.ok()) {
        throw IOException("Failed to register extension '%s': %s", extension_name,
                          registered_extension.status().message());
    }

    MemoryStream info_stream;
    BinarySerializer::Serialize(*install_info, info_stream);
    auto info_buffer = std::make_unique<char[]>(info_stream.GetPosition());
    memcpy(info_buffer.get(), info_stream.GetData(), info_stream.GetPosition());
    auto registered_info = web_fs->RegisterFileBuffer(
        local_file + ".info", io::WebFileSystem::DataBuffer(std::move(info_buffer), info_stream.GetPosition()));
    if (!registered_info.ok()) {
        throw IOException("Failed to register install metadata for extension '%s': %s", extension_name,
                          registered_info.status().message());
    }

    std::lock_guard<std::mutex> guard{mutex_};
    InstalledExtension installed;
    installed.file_system = &fs;
    installed.extension_pin = std::move(registered_extension).ValueUnsafe();
    installed.info_pin = std::move(registered_info).ValueUnsafe();
    installed_extensions_[local_file] = std::move(installed);
    return install_info;
}

void WasmExtensionProvider::RegisterAutoloadableExtensions(DatabaseInstance& db, FileSystem& fs) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) {
        throw InternalException("WebFileSystem is not configured");
    }

    auto repository = ExtensionHelper::GetAutoinstallRepository(db);
    auto local_path = ExtensionHelper::ExtensionDirectory(db, fs);
    for (const auto extension_name : AUTOLOADABLE_EXTENSIONS) {
        // HTTPFS is explicitly installed before use. Registering it as already present makes INSTALL skip the
        // provider and can deadlock a pthread while the extension initializes through the main thread.
        if (string(extension_name) == "httpfs") {
            continue;
        }
        auto local_file = fs.JoinPath(local_path, string(extension_name) + ".duckdb_extension");
        auto url = ExtensionURL(repository, extension_name);
        auto protocol = StringUtil::StartsWith(url, "http://") || StringUtil::StartsWith(url, "https://")
                            ? io::WebFileSystem::DataProtocol::HTTP
                            : io::WebFileSystem::DataProtocol::NODE_FS;
        auto registered = web_fs->RegisterFileURL(local_file, url, protocol);
        if (!registered.ok()) {
            throw IOException("Failed to register autoloadable extension '%s': %s", extension_name,
                              registered.status().message());
        }

        InstalledExtension installed;
        installed.file_system = &fs;
        installed.extension_pin = std::move(registered).ValueUnsafe();
        {
            std::lock_guard<std::mutex> guard{mutex_};
            installed_extensions_[local_file] = std::move(installed);
        }
    }
}

void* WasmExtensionProvider::OpenLibrary(const string& filename, const string& filebase) {
    // The fetch and dlopen run on the main thread: a pthread has its own JavaScript context and file system, while
    // Emscripten serves dynamic linking through the main thread.
    FetchedExtension fetched;
    InstalledExtension installed;
    {
        std::lock_guard<std::mutex> guard{mutex_};
        auto entry = installed_extensions_.find(filename);
        if (entry != installed_extensions_.end()) {
            installed = std::move(entry->second);
            installed_extensions_.erase(entry);
        }
    }
    if (installed.file_system) {
        auto file = installed.file_system->OpenFile(filename, FileFlags::FILE_FLAGS_READ);
        fetched.size = NumericCast<uint32_t>(file->GetFileSize());
        fetched.data = static_cast<char*>(malloc(fetched.size));
        file->Read(QueryContext(), fetched.data, fetched.size);
    } else if (!main_thread::OnMainThread([&] { return FetchExtension(filename, fetched); })) {
        throw IOException("Extension \"%s\" could not be fetched", filename);
    }
    auto lib_hdl =
        main_thread::OnMainThread([&] { return OpenFetchedExtension(fetched, "/" + filebase + EXTENSION_SUFFIX); });
    if (!lib_hdl) {
        throw IOException("Extension \"%s\" could not be loaded: %s", filename, GetLibraryError());
    }
    return lib_hdl;
}

void* WasmExtensionProvider::TryLoadFunction(void* library, const string& function_name) {
    return dlsym(library, function_name.c_str());
}

string WasmExtensionProvider::GetLibraryError() {
    auto message = dlerror();
    return message ? string(message) : string();
}

}  // namespace web
}  // namespace duckdb
