#include "duckdb/web/extension_provider.h"

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

}  // namespace

string WasmExtensionProvider::GetName() const { return "wasm"; }

bool WasmExtensionProvider::SupportsExternalExtensions() const { return true; }

void* WasmExtensionProvider::OpenLibrary(const string& filename, const string& filebase) {
    // The fetch and dlopen run on the main thread: a pthread has its own JavaScript context and file system, while
    // Emscripten serves dynamic linking through the main thread.
    FetchedExtension fetched;
    if (!main_thread::OnMainThread([&] { return FetchExtension(filename, fetched); })) {
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
