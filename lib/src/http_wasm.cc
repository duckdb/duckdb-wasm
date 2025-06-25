#include "duckdb/common/http_util.hpp"
#include "duckdb/web/http_wasm.h"

#include <iostream>

namespace duckdb {
class HTTPLogger;
class FileOpener;
struct FileOpenerInfo;
class HTTPState;

class HTTPFSClient : public HTTPClient {
public:
	HTTPFSClient(HTTPFSParams &http_params, const string &proto_host_port) {
	std::cout << "built HTTPFSClient with " << proto_host_port << "\n";
	host_port = proto_host_port;
/*
		client = make_uniq<duckdb_httplib_openssl::Client>(proto_host_port);
		client->set_follow_location(true);
		client->set_keep_alive(http_params.keep_alive);
		if (!http_params.ca_cert_file.empty()) {
			client->set_ca_cert_path(http_params.ca_cert_file.c_str());
		}
		client->enable_server_certificate_verification(http_params.enable_server_cert_verification);
		client->set_write_timeout(http_params.timeout, http_params.timeout_usec);
		client->set_read_timeout(http_params.timeout, http_params.timeout_usec);
		client->set_connection_timeout(http_params.timeout, http_params.timeout_usec);
		client->set_decompress(false);
		if (!http_params.bearer_token.empty()) {
			client->set_bearer_token_auth(http_params.bearer_token.c_str());
		}

		if (!http_params.http_proxy.empty()) {
			client->set_proxy(http_params.http_proxy, http_params.http_proxy_port);

			if (!http_params.http_proxy_username.empty()) {
				client->set_proxy_basic_auth(http_params.http_proxy_username, http_params.http_proxy_password);
			}
		}
		state = http_params.state;
*/
	}
	string host_port;


	unique_ptr<HTTPResponse> Get(GetRequestInfo &info) override {
	std::cout << "Get \n";
//
//std::cout << info.headers << "\n";
//std::cout << info.params << "\n";

	for (auto h : info.headers) {
		std::cout << h.first << " -- " << h.second  << "..\n";
	}
	std::cout << "\n";

unique_ptr<HTTPResponse> res;

	string path = host_port + info.url;
	path = info.url;

int n = 0;
for (auto h: info.headers) {
	n++;
}

char ** z = (char**)(void*)malloc(n * 4 * 2);

int i = 0;
for (auto h: info.headers) {
	z[i] = (char*)malloc(h.first.size()*4+1);
	memset(z[i], 0, h.first.size()*4+1);
	memcpy(z[i], h.first.c_str(), h.first.size());
	i++;
	z[i] = (char*)malloc(h.second.size()+1);
	memset(z[i], 0, h.first.size()+1);
	memcpy(z[i], h.second.c_str(), h.second.size());
	i++;
}

    char *exe = NULL;
    exe = (char *)
EM_ASM_PTR(
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
var ptr2 = HEAP32[($2 + ((i+1) * 4)) >> 2];

	try {
		//xhr.setRequestHeader(UTF8ToString(ptr1), UTF8ToString(ptr2));
		xhr.setRequestHeader(encodeURI(UTF8ToString(ptr1)), encodeURI(UTF8ToString(ptr2)));
	} catch (error) {
		console.log(error);
}
		i+=2;
	}

          try {
             xhr.send(null);
	console.log(xhr.response);
          } catch {
             return 0;
          }
          if (xhr.status != 200)
            return 0;
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
		console.log(properArray);
            return fileOnWasmHeap;
        }, path.c_str(), n, z, "GET");


i = 0;
for (auto h: info.headers) {
	free(z[i]);
	i++;
	free(z[i]);
	i++;
}
free(z);

    if (!exe) {
	res = make_uniq<HTTPResponse>(HTTPStatusCode::NotFound_404);
      res->reason = "Unknown error, something went quack in Wasm land! Please consult the console and or the docs at https://duckdb.org/community_extensions/extensions/webmacro";
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


/*
		if (state) {
			state->get_count++;
		}
		auto headers = TransformHeaders(info.headers, info.params);
		if (!info.response_handler && !info.content_handler) {
			return TransformResult(client->Get(info.path, headers));
		} else {
			return TransformResult(client->Get(
			    info.path.c_str(), headers,
			    [&](const duckdb_httplib_openssl::Response &response) {
				    auto http_response = TransformResponse(response);
				    return info.response_handler(*http_response);
			    },
			    [&](const char *data, size_t data_length) {
				    if (state) {
					    state->total_bytes_received += data_length;
				    }
				    return info.content_handler(const_data_ptr_cast(data), data_length);
			    }));
		}
*/
	}
	unique_ptr<HTTPResponse> Post(PostRequestInfo &info) override {
	std::cout << "Post \n";
//
//std::cout << info.headers << "\n";
//std::cout << info.params << "\n";


	for (auto h : info.headers) {
		std::cout << h.first << " -- " << h.second  << "..\n";
	}
	std::cout << "\n";

unique_ptr<HTTPResponse> res;

	string path = host_port + info.url;
	path = info.url;

int n = 0;
for (auto h: info.headers) {
	n++;
}

char ** z = (char**)(void*)malloc(n * 4 * 2);

int i = 0;
for (auto h: info.headers) {
	z[i] = (char*)malloc(h.first.size()*4+1);
	memset(z[i], 0, h.first.size()*4+1);
	memcpy(z[i], h.first.c_str(), h.first.size());
	i++;
	z[i] = (char*)malloc(h.second.size()*4+1);
	memset(z[i], 0, h.first.size()*4+1);
	memcpy(z[i], h.second.c_str(), h.second.size());
	i++;
}

    char *exe = NULL;
    exe = (char *)
EM_ASM_PTR(
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
var ptr2 = HEAP32[($2 + ((i+1) * 4)) >> 2];

	try {
		xhr.setRequestHeader(encodeURI(UTF8ToString(ptr1)), encodeURI(UTF8ToString(ptr2)));
	} catch (error) {
		console.log(error);
	}
		i+=2;
	}

          try {
             xhr.send(UTF8ToString($4));
          } catch {
             return 0;
          }
          if (xhr.status != 200)
            return 0;
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
		console.log(properArray);
            return fileOnWasmHeap;
        }, path.c_str(), n, z, "POST", info.buffer_in);


i = 0;
for (auto h: info.headers) {
	free(z[i]);
	i++;
	free(z[i]);
	i++;
}
free(z);

    if (!exe) {
	res = make_uniq<HTTPResponse>(HTTPStatusCode::NotFound_404);
      res->reason = "Unknown error, something went quack in Wasm land! Please consult the console and or the docs at https://duckdb.org/community_extensions/extensions/webmacro";
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


/*
		if (state) {
			state->get_count++;
		}
		auto headers = TransformHeaders(info.headers, info.params);
		if (!info.response_handler && !info.content_handler) {
			return TransformResult(client->Get(info.path, headers));
		} else {
			return TransformResult(client->Get(
			    info.path.c_str(), headers,
			    [&](const duckdb_httplib_openssl::Response &response) {
				    auto http_response = TransformResponse(response);
				    return info.response_handler(*http_response);
			    },
			    [&](const char *data, size_t data_length) {
				    if (state) {
					    state->total_bytes_received += data_length;
				    }
				    return info.content_handler(const_data_ptr_cast(data), data_length);
			    }));
		}
*/
	}
	unique_ptr<HTTPResponse> Put(PutRequestInfo &info) override {
	std::cout << "Put \n";
	return nullptr;
/*
		if (state) {
			state->put_count++;
			state->total_bytes_sent += info.buffer_in_len;
		}
		auto headers = TransformHeaders(info.headers, info.params);
		return TransformResult(client->Put(info.path, headers, const_char_ptr_cast(info.buffer_in), info.buffer_in_len,
		                                   info.content_type));
*/
	}

	unique_ptr<HTTPResponse> Head(HeadRequestInfo &info) override {
	std::cout << "Head \n";
	return nullptr;
/*
		if (state) {

			state->head_count++;
		}
		auto headers = TransformHeaders(info.headers, info.params);
		return TransformResult(client->Head(info.path, headers));
*/
	}

	unique_ptr<HTTPResponse> Delete(DeleteRequestInfo &info) override {
	return nullptr;
/*
		if (state) {
			state->delete_count++;
		}
		auto headers = TransformHeaders(info.headers, info.params);
		return TransformResult(client->Delete(info.path, headers));
*/
	}


private:
/*
	duckdb_httplib_openssl::Headers TransformHeaders(const HTTPHeaders &header_map, const HTTPParams &params) {
		duckdb_httplib_openssl::Headers headers;
		for (auto &entry : header_map) {
			headers.insert(entry);
		}
		for (auto &entry : params.extra_headers) {
			headers.insert(entry);
		}
		return headers;
	}

	unique_ptr<HTTPResponse> TransformResponse(const duckdb_httplib_openssl::Response &response) {
		auto status_code = HTTPUtil::ToStatusCode(response.status);
		auto result = make_uniq<HTTPResponse>(status_code);
		result->body = response.body;
		result->reason = response.reason;
		for (auto &entry : response.headers) {
			result->headers.Insert(entry.first, entry.second);
		}
		return result;
	}

	unique_ptr<HTTPResponse> TransformResult(duckdb_httplib_openssl::Result &&res) {
		if (res.error() == duckdb_httplib_openssl::Error::Success) {
			auto &response = res.value();
			return TransformResponse(response);
		} else {
			auto result = make_uniq<HTTPResponse>(HTTPStatusCode::INVALID);
			result->request_error = to_string(res.error());
			return result;
		}
	}
*/
private:
//	unique_ptr<duckdb_httplib_openssl::Client> client;
	optional_ptr<HTTPState> state;
};

unique_ptr<HTTPClient> HTTPWasmUtil::InitializeClient(HTTPParams &http_params, const string &proto_host_port) {
	auto client = make_uniq<HTTPFSClient>(http_params.Cast<HTTPFSParams>(), proto_host_port);
	return std::move(client);
}

string HTTPWasmUtil::GetName() const {
	return "WasmHTTPUtils";
}

}  // namespace ducdkb
