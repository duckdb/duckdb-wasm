#include "duckdb/web/http_wasm.h"

#include <emscripten.h>

#include <iostream>

#include "duckdb/common/http_util.hpp"

namespace duckdb {
class HTTPLogger;
class FileOpener;
struct FileOpenerInfo;
class HTTPState;

class HTTPFSClient : public HTTPClient {
   public:
    HTTPFSClient(HTTPFSParams &http_params, const string &proto_host_port) { host_port = proto_host_port; }
    string host_port;

    unique_ptr<HTTPResponse> Get(GetRequestInfo &info) override {
        unique_ptr<HTTPResponse> res;

        string path = host_port + info.url;
        path = info.url;

        int n = 0;
        for (auto h : info.headers) {
            n++;
        }

        char **z = (char **)(void *)malloc(n * 4 * 2);

        int i = 0;
        for (auto h : info.headers) {
            z[i] = (char *)malloc(h.first.size() * 4 + 1);
            memset(z[i], 0, h.first.size() * 4 + 1);
            memcpy(z[i], h.first.c_str(), h.first.size());
            i++;
            z[i] = (char *)malloc(h.second.size() * 4 + 1);
            memset(z[i], 0, h.first.size() * 4 + 1);
            memcpy(z[i], h.second.c_str(), h.second.size());
            i++;
        }

        // clang-format off
        char *exe = NULL;
        exe = (char *)EM_ASM_PTR(
            {
                var url = (UTF8ToString($0));
                if (typeof XMLHttpRequest === "undefined") {
                    return 0;
                }
                const xhr = new XMLHttpRequest();
                xhr.open(UTF8ToString($3), url, false);
                xhr.responseType = "arraybuffer";

                var i = 0;
                var len = $1;
                while (i < len) {
                    var ptr1 = HEAP32[($2 + (i * 4)) >> 2];
                    var ptr2 = HEAP32[($2 + ((i + 1) * 4)) >> 2];

                    try {
                        xhr.setRequestHeader(encodeURI(UTF8ToString(ptr1)), encodeURI(UTF8ToString(ptr2)));
                    } catch (error) {
                console.warn("Error while performing XMLHttpRequest.setRequestHeader()", error);
                    }
                    i += 2;
                }

                try {
                    xhr.send(null);
                } catch {
                    return 0;
                }
                if (xhr.status != 200) return 0;
                var uInt8Array = xhr.response;

                var len = uInt8Array.byteLength;
                var fileOnWasmHeap = _malloc(len + 4);

                var properArray = new Uint8Array(uInt8Array);

                for (var iii = 0; iii < len; iii++) {
                    Module.HEAPU8[iii + fileOnWasmHeap + 4] = properArray[iii];
                }
                var LEN123 = new Uint8Array(4);
                LEN123[0] = len % 256;
                len -= LEN123[0];
                len /= 256;
                LEN123[1] = len % 256;
                len -= LEN123[1];
                len /= 256;
                LEN123[2] = len % 256;
                len -= LEN123[2];
                len /= 256;
                LEN123[3] = len % 256;
                len -= LEN123[3];
                len /= 256;
                Module.HEAPU8.set(LEN123, fileOnWasmHeap);
                return fileOnWasmHeap;
            },
            path.c_str(), n, z, "GET");
        // clang-format on

        i = 0;
        for (auto h : info.headers) {
            free(z[i]);
            i++;
            free(z[i]);
            i++;
        }
        free(z);

        if (!exe) {
            res = make_uniq<HTTPResponse>(HTTPStatusCode::NotFound_404);
            res->reason =
                "Unknown error, something went wrong in Wasm land! Please consult the console and consider reporting a "
                "bug";
        } else {
            res = duckdb::make_uniq<HTTPResponse>(HTTPStatusCode::OK_200);
            uint64_t LEN = 0;
            LEN *= 256;
            LEN += ((uint8_t *)exe)[3];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[2];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[1];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[0];
            res->body = string(exe + 4, LEN);
            free(exe);
        }

        return res;
    }
    unique_ptr<HTTPResponse> Post(PostRequestInfo &info) override {
        unique_ptr<HTTPResponse> res;

        string path = host_port + info.url;
        path = info.url;

        int n = 0;
        for (auto h : info.headers) {
            n++;
        }

        char **z = (char **)(void *)malloc(n * 4 * 2);

        int i = 0;
        for (auto h : info.headers) {
            z[i] = (char *)malloc(h.first.size() * 4 + 1);
            memset(z[i], 0, h.first.size() * 4 + 1);
            memcpy(z[i], h.first.c_str(), h.first.size());
            i++;
            z[i] = (char *)malloc(h.second.size() * 4 + 1);
            memset(z[i], 0, h.first.size() * 4 + 1);
            memcpy(z[i], h.second.c_str(), h.second.size());
            i++;
        }

        // clang-format off
        char *exe = NULL;
        exe = (char *)EM_ASM_PTR(
            {
                var url = (UTF8ToString($0));
                if (typeof XMLHttpRequest === "undefined") {
                    return 0;
                }
                const xhr = new XMLHttpRequest();
                xhr.open(UTF8ToString($3), url, false);
                xhr.responseType = "arraybuffer";

                var i = 0;
                var len = $1;
                while (i < len) {
                    var ptr1 = HEAP32[($2 + (i * 4)) >> 2];
                    var ptr2 = HEAP32[($2 + ((i + 1) * 4)) >> 2];

                    try {
                        xhr.setRequestHeader(encodeURI(UTF8ToString(ptr1)), encodeURI(UTF8ToString(ptr2)));
                    } catch (error) {
                console.warn("Error while performing XMLHttpRequest.setRequestHeader()", error);
                    }
                    i += 2;
                }

                try {
                    xhr.send(UTF8ToString($4));
                } catch {
                    return 0;
                }
                if (xhr.status != 200) return 0;
                var uInt8Array = xhr.response;

                var len = uInt8Array.byteLength;
                var fileOnWasmHeap = _malloc(len + 4);

                var properArray = new Uint8Array(uInt8Array);

                for (var iii = 0; iii < len; iii++) {
                    Module.HEAPU8[iii + fileOnWasmHeap + 4] = properArray[iii];
                }
                var LEN123 = new Uint8Array(4);
                LEN123[0] = len % 256;
                len -= LEN123[0];
                len /= 256;
                LEN123[1] = len % 256;
                len -= LEN123[1];
                len /= 256;
                LEN123[2] = len % 256;
                len -= LEN123[2];
                len /= 256;
                LEN123[3] = len % 256;
                len -= LEN123[3];
                len /= 256;
                Module.HEAPU8.set(LEN123, fileOnWasmHeap);
                return fileOnWasmHeap;
            },
            path.c_str(), n, z, "POST", info.buffer_in);

        i = 0;
        for (auto h : info.headers) {
            free(z[i]);
            i++;
            free(z[i]);
            i++;
        }
        free(z);

        if (!exe) {
            res = make_uniq<HTTPResponse>(HTTPStatusCode::NotFound_404);
            res->reason =
                "Unknown error, something went quack in Wasm land! Please consult the console and or the docs at "
                "https://duckdb.org/community_extensions/extensions/webmacro";
        } else {
            res = duckdb::make_uniq<HTTPResponse>(HTTPStatusCode::OK_200);
            uint64_t LEN = 0;
            LEN *= 256;
            LEN += ((uint8_t *)exe)[3];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[2];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[1];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[0];
            res->body = string(exe + 4, LEN);
            free(exe);
        }
        // clang-format on

        return res;
    }
    unique_ptr<HTTPResponse> Put(PutRequestInfo &info) override { return nullptr; }

    unique_ptr<HTTPResponse> Head(HeadRequestInfo &info) override { return nullptr; }

    unique_ptr<HTTPResponse> Delete(DeleteRequestInfo &info) override { return nullptr; }

   private:
    optional_ptr<HTTPState> state;
};

unique_ptr<HTTPClient> HTTPWasmUtil::InitializeClient(HTTPParams &http_params, const string &proto_host_port) {
    auto client = make_uniq<HTTPFSClient>(http_params.Cast<HTTPFSParams>(), proto_host_port);
    return std::move(client);
}

string HTTPWasmUtil::GetName() const { return "WasmHTTPUtils"; }

}  // namespace duckdb
