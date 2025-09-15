#include "duckdb/web/http_wasm.h"

#include <emscripten.h>

#include <iostream>

#include "duckdb/common/http_util.hpp"
#include "duckdb/web/config.h"

namespace duckdb {
class HTTPLogger;
class FileOpener;
struct FileOpenerInfo;
class HTTPState;

class HTTPWasmClient : public HTTPClient {
   public:
    HTTPWasmClient(HTTPFSParams &http_params, const string &proto_host_port) { host_port = proto_host_port; }
    string host_port;

    unique_ptr<HTTPResponse> Get(GetRequestInfo &info) override {
        // clang-format off
        unique_ptr<HTTPResponse> res;

        string path = host_port + info.url;
        path = info.url;
        if (!web::experimental_s3_tables_global_proxy.empty()) {
            if (info.url.rfind(web::experimental_s3_tables_global_proxy, 0) != 0) {
                auto id_table = path.find("--table-s3.s3.");
                auto id_aws = path.find(".amazonaws.com/");
                if (id_table != std::string::npos && id_aws != std::string::npos && id_table < id_aws) {
                    path = web::experimental_s3_tables_global_proxy + path.substr(8);
                }
            }
        }
        if ((path.rfind("https://", 0) != 0) && (path.rfind("http://", 0) != 0)) {
            path = "https://" + path;
        }

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
            memset(z[i], 0, h.second.size() * 4 + 1);
            memcpy(z[i], h.second.c_str(), h.second.size());
            i++;
        }

        char *exe = NULL;
        exe = (char *)EM_ASM_PTR(
            {
                var url = (UTF8ToString($0));
                if (typeof XMLHttpRequest === "undefined") {
                    return 0;
                }
                const xhr = new XMLHttpRequest();
		if (false && url.startsWith("http://")) {
			url = "https://" + url.substr(7);
		}
                xhr.open(UTF8ToString($3), url, false);
                xhr.responseType = "arraybuffer";

                var i = 0;
                var len = $1;
                while (i < len*2) {
                    var ptr1 = HEAP32[($2)/4 + i ];
                    var ptr2 = HEAP32[($2)/4 + i + 1];

                    try {
			var z = encodeURI(UTF8ToString(ptr1));
			if (z === "Host") z = "X-Host-Override";
			if (z === "User-Agent") z = "X-user-agent";
			if (z === "Authorization") {
                        	xhr.setRequestHeader(z, UTF8ToString(ptr2));
			} else {
				
                        	xhr.setRequestHeader(z, encodeURI(UTF8ToString(ptr2)));
			}
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
                if (xhr.status >= 400) return 0;
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
            res->reason = "Please consult the browser console for details, might be potentially a CORS error";
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

idx_t LEN_X_T = LEN;
            if (info.content_handler) {
                info.content_handler(((const unsigned char *)exe) + 4, LEN_X_T);
            }

            free(exe);
        }

        return res;
    }
    unique_ptr<HTTPResponse> Head(HeadRequestInfo &info) override {
        unique_ptr<HTTPResponse> res;

        string path = host_port + info.url;
        path = info.url;
        if (!web::experimental_s3_tables_global_proxy.empty()) {
            if (info.url.rfind(web::experimental_s3_tables_global_proxy, 0) != 0) {
                auto id_table = path.find("--table-s3.s3.");
                auto id_aws = path.find(".amazonaws.com/");
                if (id_table != std::string::npos && id_aws != std::string::npos && id_table < id_aws) {
                    path = web::experimental_s3_tables_global_proxy + path.substr(8);
                }
            }
        }
        if ((path.rfind("https://", 0) != 0) && (path.rfind("http://", 0) != 0)) {
            path = "https://" + path;
        }
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
            memset(z[i], 0, h.second.size() * 4 + 1);
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
		if (false && url.startsWith("http://")) {
			url = "https://" + url.substr(7);
		}
                xhr.open(UTF8ToString($3), url, false);
                xhr.responseType = "arraybuffer";

                var i = 0;
                var len = $1;
                while (i < len*2) {
                    var ptr1 = HEAP32[($2)/4 + i ];
                    var ptr2 = HEAP32[($2)/4 + i + 1];

                    try {
			var z = encodeURI(UTF8ToString(ptr1));
			if (z === "Host") z = "X-Host-Override";
			if (z === "User-Agent") z = "X-user-agent";
			if (z === "Authorization") {
                        	xhr.setRequestHeader(z, UTF8ToString(ptr2));
			} else {
				
                        	xhr.setRequestHeader(z, encodeURI(UTF8ToString(ptr2)));
			}
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
                if (xhr.status >= 400) return 0;

                var uInt8Array = xhr.response;
                var len = uInt8Array.byteLength;
                var fileOnWasmHeap = _malloc(len + 8);

                var properArray = new Uint8Array(uInt8Array);

                for (var iii = 0; iii < len; iii++) {
                    Module.HEAPU8[iii + fileOnWasmHeap + 8] = properArray[iii];
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
                Module.HEAPU8.set(LEN123, fileOnWasmHeap + 4);

		var headers = Uint8Array.from(Array.from(xhr.getAllResponseHeaders()).map(letter => letter.charCodeAt(0)));
		len = headers.byteLength;
                var headersOnWasmHeap = _malloc(len + 8);
                for (var iii = 0; iii < len; iii++) {
                    Module.HEAPU8[iii + headersOnWasmHeap + 8] = headers[iii];
                }

                LEN123 = new Uint8Array(4);
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
                Module.HEAPU8.set(LEN123, headersOnWasmHeap + 4);

		len = headersOnWasmHeap;
                LEN123 = new Uint8Array(4);
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
            path.c_str(), n, z, "HEAD");

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
            res->reason = "Please consult the browser console for details, might be potentially a CORS error";
        } else {
            res = duckdb::make_uniq<HTTPResponse>(HTTPStatusCode::OK_200);

		uint64_t next = 0;
	{
            uint64_t LEN = 0;	
            LEN *= 256;
            LEN += ((uint8_t *)exe)[3];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[2];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[1];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[0];
		next = LEN;
	}
		uint64_t len = 0;
	{
            uint64_t LEN = 0;	
            LEN *= 256;
            LEN += ((uint8_t *)exe)[3 + 4];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[2 + 4];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[1 + 4];
            LEN *= 256;
            LEN += ((uint8_t *)exe)[0 + 4];
		len = LEN;
	}

		uint64_t len_headers = 0;
	{
            uint64_t LEN = 0;	
            LEN *= 256;
            LEN += ((uint8_t *)next)[3 + 4];
            LEN *= 256;
            LEN += ((uint8_t *)next)[2 + 4];
            LEN *= 256;
            LEN += ((uint8_t *)next)[1 + 4];
            LEN *= 256;
            LEN += ((uint8_t *)next)[0 + 4];
		len_headers = LEN;
	}
		
	char * ptr = reinterpret_cast<char*>(next) ;


	string headers = string(ptr + 8, len_headers);

vector<string> vec_headers = StringUtil::Split(headers, "\r\n");

for (auto h : vec_headers) {
int i = 0;
while (i < h.size() && h[i] != ':') i++;

string head = string(h.c_str(), i);

while (i < h.size() && h[i] != ' ') i++;
string tail = string(h.c_str() + i+1);

res->headers.Insert(head, tail);	
	}
	




            res->body = string(exe + 8, len);
            /*
                        if (info.content_handler) {
                            info.content_handler((const unsigned char *)exe + 4, LEN);
                        }
            */

            free(exe);
            free(ptr);
        }
        // clang-format on

        return res;
    }
    unique_ptr<HTTPResponse> Post(PostRequestInfo &info) override {
        unique_ptr<HTTPResponse> res;

        string path = host_port + info.url;
        path = info.url;
        if (!web::experimental_s3_tables_global_proxy.empty()) {
            if (info.url.rfind(web::experimental_s3_tables_global_proxy, 0) != 0) {
                auto id_table = path.find("--table-s3.s3.");
                auto id_aws = path.find(".amazonaws.com/");
                if (id_table != std::string::npos && id_aws != std::string::npos && id_table < id_aws) {
                    path = web::experimental_s3_tables_global_proxy + path.substr(8);
                }
            }
        }
        if ((path.rfind("https://", 0) != 0) && (path.rfind("http://", 0) != 0)) {
            path = "https://" + path;
        }

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
            memset(z[i], 0, h.second.size() * 4 + 1);
            memcpy(z[i], h.second.c_str(), h.second.size());
            i++;
        }

        const int buffer_length = info.buffer_in_len;
        char *payload = (char *)malloc(buffer_length);
        memcpy(payload, info.buffer_in, buffer_length);

        // clang-format off
        char *exe = NULL;
        exe = (char *)EM_ASM_PTR(
            {
                var url = (UTF8ToString($0));
                if (typeof XMLHttpRequest === "undefined") {
                    return 0;
                }
                const xhr = new XMLHttpRequest();
		if (false && url.startsWith("http://")) {
			url = "https://" + url.substr(7);
		}
                xhr.open(UTF8ToString($3), url, false);
                xhr.responseType = "arraybuffer";

                var i = 0;
                var len = $1;
                while (i < len*2) {
                    var ptr1 = HEAP32[($2)/4 + i ];
                    var ptr2 = HEAP32[($2)/4 + i + 1];

                    try {
			var z = encodeURI(UTF8ToString(ptr1));
			if (z === "Host") z = "X-Host-Override";
			if (z === "User-Agent") z = "X-user-agent";
			if (z === "Authorization") {
                        	xhr.setRequestHeader(z, UTF8ToString(ptr2));
			} else {
				
                        	xhr.setRequestHeader(z, encodeURI(UTF8ToString(ptr2)));
			}
                    } catch (error) {
                console.warn("Error while performing XMLHttpRequest.setRequestHeader()", error);
                    }
                    i += 2;
                }

//xhr.setRequestHeader("Content-Type", "application/octet-stream");
//xhr.setRequestHeader("Content-Type", "text/json");
                try {
			var post_payload = new Uint8Array($5);

			for (var iii = 0; iii < $5; iii++) {
				post_payload[iii] = Module.HEAPU8[iii + $4];
			}
			xhr.send(post_payload);
                } catch {
                    return 0;
                }
                if (xhr.status >= 400) return 0;
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
            path.c_str(), n, z, "POST", payload, buffer_length);
        // clang-format on

        free(payload);

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
            res->reason = "Please consult the browser console for details, might be potentially a CORS error";
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

            info.buffer_out += string(exe + 4, LEN);

            free(exe);
        }

        return res;
    }
    unique_ptr<HTTPResponse> Put(PutRequestInfo &info) override {
        unique_ptr<HTTPResponse> res;

        string path = host_port + info.url;
        path = info.url;
        if (!web::experimental_s3_tables_global_proxy.empty()) {
            if (info.url.rfind(web::experimental_s3_tables_global_proxy, 0) != 0) {
                auto id_table = path.find("--table-s3.s3.");
                auto id_aws = path.find(".amazonaws.com/");
                if (id_table != std::string::npos && id_aws != std::string::npos && id_table < id_aws) {
                    path = web::experimental_s3_tables_global_proxy + path.substr(8);
                }
            }
        }
        if ((path.rfind("https://", 0) != 0) && (path.rfind("http://", 0) != 0)) {
            path = "https://" + path;
        }

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
            memset(z[i], 0, h.second.size() * 4 + 1);
            memcpy(z[i], h.second.c_str(), h.second.size());
            i++;
        }

        const int buffer_length = info.buffer_in_len;
        char *payload = (char *)malloc(buffer_length);
        memcpy(payload, info.buffer_in, buffer_length);

        // clang-format off
        char *exe = NULL;
        exe = (char *)EM_ASM_PTR(
            {
                var url = (UTF8ToString($0));
                if (typeof XMLHttpRequest === "undefined") {
                    return 0;
                }
                const xhr = new XMLHttpRequest();
		if (false && url.startsWith("http://")) {
			url = "https://" + url.substr(7);
		}
                xhr.open(UTF8ToString($3), url, false);
                xhr.responseType = "arraybuffer";

                var i = 0;
                var len = $1;
                while (i < len*2) {
                    var ptr1 = HEAP32[($2)/4 + i ];
                    var ptr2 = HEAP32[($2)/4 + i + 1];

                    try {
			var z = encodeURI(UTF8ToString(ptr1));
			if (z === "Host") z = "X-Host-Override";
			if (z === "User-Agent") z = "X-user-agent";
			if (z === "Authorization") {
                        	xhr.setRequestHeader(z, UTF8ToString(ptr2));
			} else {
				
                        	xhr.setRequestHeader(z, encodeURI(UTF8ToString(ptr2)));
			}
                    } catch (error) {
                console.warn("Error while performing XMLHttpRequest.setRequestHeader()", error);
                    }
                    i += 2;
                }

//xhr.setRequestHeader("Content-Type", "application/octet-stream");
//xhr.setRequestHeader("Content-Type", "text/json");
                try {
			var post_payload = new Uint8Array($5);

			for (var iii = 0; iii < $5; iii++) {
				post_payload[iii] = Module.HEAPU8[iii + $4];
			}
			xhr.send(post_payload);
                } catch {
                    return 0;
                }
                if (xhr.status >= 400) return 0;
		var uInt8Array = Uint8Array.from(Array.from(xhr.getResponseHeader("Etag")).map(letter => letter.charCodeAt(0)));

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
            path.c_str(), n, z, "PUT", payload, buffer_length);
        // clang-format on

        free(payload);

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
            res->reason = "Please consult the browser console for details, might be potentially a CORS error";
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
            res->headers.Insert("ETag", string(exe + 4, LEN));

            // info.buffer_out += string(exe + 4, LEN);

            free(exe);
        }

        return res;
    }
    unique_ptr<HTTPResponse> Delete(DeleteRequestInfo &info) override {
        unique_ptr<HTTPResponse> res;

        string path = host_port + info.url;
        path = info.url;

        if (!web::experimental_s3_tables_global_proxy.empty()) {
            if (info.url.rfind(web::experimental_s3_tables_global_proxy, 0) != 0) {
                auto id_table = path.find("--table-s3.s3.");
                auto id_aws = path.find(".amazonaws.com/");
                if (id_table != std::string::npos && id_aws != std::string::npos && id_table < id_aws) {
                    path = web::experimental_s3_tables_global_proxy + path.substr(8);
                }
            }
        }
        if ((path.rfind("https://", 0) != 0) && (path.rfind("http://", 0) != 0)) {
            path = "https://" + path;
        }

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
            memset(z[i], 0, h.second.size() * 4 + 1);
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
		if (false && url.startsWith("http://")) {
			url = "https://" + url.substr(7);
		}
                xhr.open(UTF8ToString($3), url, false);
                xhr.responseType = "arraybuffer";

                var i = 0;
                var len = $1;
                while (i < len*2) {
                    var ptr1 = HEAP32[($2)/4 + i ];
                    var ptr2 = HEAP32[($2)/4 + i + 1];

                    try {
			var z = encodeURI(UTF8ToString(ptr1));
			if (z === "Host") z = "X-Host-Override";
			if (z === "User-Agent") z = "X-user-agent";
			if (z === "Authorization") {
                        	xhr.setRequestHeader(z, UTF8ToString(ptr2));
			} else {
				
                        	xhr.setRequestHeader(z, encodeURI(UTF8ToString(ptr2)));
			}
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
                if (xhr.status >= 400) return 0;
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
            path.c_str(), n, z, "DELETE");
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
            res->reason = "Please consult the browser console for details, might be potentially a CORS error";
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
            /*
                        if (info.content_handler) {
                            info.content_handler((const unsigned char *)exe + 4, LEN);
                        }
            */

            free(exe);
        }

        return res;
    }

   private:
    optional_ptr<HTTPState> state;
};

unique_ptr<HTTPClient> HTTPWasmUtil::InitializeClient(HTTPParams &http_params, const string &proto_host_port) {
    auto client = make_uniq<HTTPWasmClient>(http_params.Cast<HTTPFSParams>(), proto_host_port);
    return std::move(client);
}

string HTTPWasmUtil::GetName() const { return "WasmHTTPUtils"; }

}  // namespace duckdb
