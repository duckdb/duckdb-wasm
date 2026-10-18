#include "http_client.hpp"

#include <cstdint>
#include <cstring>

#include "duckdb/common/enums/http_status_code.hpp"
#include "duckdb/main/http/http_util.hpp"
#include "http/httpfs_client.hpp"

// The imports. Pointers and sizes are the module's (32 or 64 bit), the host checks every range.
extern "C" {
__attribute__((import_module("sandbox_http"), import_name("request"))) int32_t sandbox_http_request(const uint8_t *req,
                                                                                                    size_t len);
__attribute__((import_module("sandbox_http"), import_name("status"))) int32_t sandbox_http_status(int32_t handle);
__attribute__((import_module("sandbox_http"), import_name("headers"))) int64_t sandbox_http_headers(int32_t handle,
                                                                                                    uint8_t *buf,
                                                                                                    size_t cap);
__attribute__((import_module("sandbox_http"), import_name("read"))) int64_t sandbox_http_read(int32_t handle,
                                                                                              uint8_t *buf, size_t cap);
__attribute__((import_module("sandbox_http"), import_name("error"))) int64_t sandbox_http_error(int32_t handle,
                                                                                                uint8_t *buf,
                                                                                                size_t cap);
__attribute__((import_module("sandbox_http"), import_name("close"))) void sandbox_http_close(int32_t handle);
}

namespace duckdb {
namespace {

// The request as the relay reads it (little endian): method, timeout in ms, url, headers, body
enum class RelayMethod : uint8_t { GET = 0, PUT = 1, HEAD = 2, DELETE = 3, POST = 4, OPTIONS = 5 };

string SerializeRequest(RelayMethod method, const BaseRequest &request, const HTTPHeaders &headers,
                        const_data_ptr_t body, idx_t body_len) {
	string out;
	auto u8 = [&](uint8_t v) { out.push_back(static_cast<char>(v)); };
	auto u32 = [&](uint32_t v) { out.append(reinterpret_cast<const char *>(&v), 4); };
	auto u64 = [&](uint64_t v) { out.append(reinterpret_cast<const char *>(&v), 8); };
	auto bytes = [&](const string &s) {
		u32(static_cast<uint32_t>(s.size()));
		out.append(s);
	};
	u8(static_cast<uint8_t>(method));
	uint64_t timeout_ms = request.params.timeout * 1000 + request.params.timeout_usec / 1000;
	u32(timeout_ms > UINT32_MAX ? UINT32_MAX : static_cast<uint32_t>(timeout_ms));
	bytes(request.url);
	uint32_t count = 0;
	for (auto it = headers.begin(); it != headers.end(); ++it) {
		count++;
	}
	u32(count);
	for (auto it = headers.begin(); it != headers.end(); ++it) {
		bytes(it->first);
		bytes(it->second);
	}
	u64(body_len);
	if (body_len > 0) {
		out.append(reinterpret_cast<const char *>(body), body_len);
	}
	return out;
}

string RelayError(int32_t handle) {
	string text;
	text.resize(1024);
	int64_t n = sandbox_http_error(handle, reinterpret_cast<uint8_t *>(&text[0]), text.size());
	if (n < 0) {
		return "relay error";
	}
	if (static_cast<size_t>(n) > text.size()) {
		text.resize(static_cast<size_t>(n));
		n = sandbox_http_error(handle, reinterpret_cast<uint8_t *>(&text[0]), text.size());
	}
	text.resize(n < 0 ? 0 : static_cast<size_t>(n));
	return text;
}

void ParseHeaders(const string &lines, HTTPHeaders &headers) {
	size_t pos = 0;
	while (pos < lines.size()) {
		size_t end = lines.find('\n', pos);
		if (end == string::npos) {
			end = lines.size();
		}
		size_t colon = lines.find(':', pos);
		if (colon != string::npos && colon < end) {
			size_t value = colon + 1;
			while (value < end && lines[value] == ' ') {
				value++;
			}
			headers.Insert(lines.substr(pos, colon - pos), lines.substr(value, end - value));
		}
		pos = end + 1;
	}
}

class SandboxHTTPClient : public HTTPClient {
public:
	void Initialize(HTTPParams &http_params) override {
	}

	unique_ptr<HTTPResponse> Get(GetRequestInfo &info) override {
		return Perform(RelayMethod::GET, info, nullptr, 0, nullptr, info.response_handler ? &info.response_handler : nullptr,
		               info.content_handler ? &info.content_handler : nullptr);
	}
	unique_ptr<HTTPResponse> Put(PutRequestInfo &info) override {
		return Perform(RelayMethod::PUT, info, info.buffer_in, info.buffer_in_len,
		               info.content_type.empty() ? nullptr : &info.content_type, nullptr, nullptr);
	}
	unique_ptr<HTTPResponse> Head(HeadRequestInfo &info) override {
		return Perform(RelayMethod::HEAD, info, nullptr, 0, nullptr, nullptr, nullptr);
	}
	unique_ptr<HTTPResponse> Delete(DeleteRequestInfo &info) override {
		return Perform(RelayMethod::DELETE, info, nullptr, 0, nullptr, nullptr, nullptr);
	}
	unique_ptr<HTTPResponse> Post(PostRequestInfo &info) override {
		auto response = Perform(RelayMethod::POST, info, info.buffer_in, info.buffer_in_len, nullptr, nullptr, nullptr);
		info.buffer_out = response->body;
		return response;
	}
	unique_ptr<HTTPResponse> Options(OptionsRequestInfo &info) override {
		return Perform(RelayMethod::OPTIONS, info, nullptr, 0, nullptr, nullptr, nullptr);
	}

private:
	unique_ptr<HTTPResponse> Perform(RelayMethod method, BaseRequest &request, const_data_ptr_t body, idx_t body_len,
	                                 const string *content_type,
	                                 const std::function<bool(const HTTPResponse &)> *response_handler,
	                                 const std::function<bool(const_data_ptr_t, idx_t)> *content_handler) {
		// request.headers already carry the extra headers of the parameters (BaseRequest merges them), as
		// duckdb-wasm's client also forwards them unchanged
		HTTPHeaders headers = request.headers;
		if (content_type) {
			headers.Insert("Content-Type", *content_type);
		}
		auto bytes = SerializeRequest(method, request, headers, body, body_len);
		int32_t handle = sandbox_http_request(reinterpret_cast<const uint8_t *>(bytes.data()), bytes.size());
		if (handle < 0) {
			auto failed = make_uniq<HTTPResponse>(static_cast<HTTPStatusCode>(0));
			failed->url = request.url;
			failed->success = false;
			failed->request_error = RelayError(-1);
			return failed;
		}
		auto response = make_uniq<HTTPResponse>(static_cast<HTTPStatusCode>(sandbox_http_status(handle)));
		response->url = request.url;

		string lines;
		lines.resize(4096);
		int64_t need = sandbox_http_headers(handle, reinterpret_cast<uint8_t *>(&lines[0]), lines.size());
		if (need > static_cast<int64_t>(lines.size())) {
			lines.resize(static_cast<size_t>(need));
			need = sandbox_http_headers(handle, reinterpret_cast<uint8_t *>(&lines[0]), lines.size());
		}
		lines.resize(need < 0 ? 0 : static_cast<size_t>(need));
		ParseHeaders(lines, response->headers);

		if (response_handler && !(*response_handler)(*response)) {
			sandbox_http_close(handle);
			return response;
		}
		// the body, streamed to the handler or collected
		uint8_t chunk[65536];
		while (true) {
			int64_t n = sandbox_http_read(handle, chunk, sizeof chunk);
			if (n < 0) {
				response->success = false;
				response->request_error = RelayError(handle);
				break;
			}
			if (n == 0) {
				break;
			}
			if (content_handler) {
				if (!(*content_handler)(chunk, static_cast<idx_t>(n))) {
					break;
				}
			} else {
				response->body.append(reinterpret_cast<const char *>(chunk), static_cast<size_t>(n));
			}
		}
		sandbox_http_close(handle);
		return response;
	}
};

// httpfs expects the configured HTTPUtil to be an HTTPFSUtil (it casts to it for its parameters and secrets), and
// treats one named like duckdb-wasm's as not replaceable by its own curl or httplib clients
class SandboxHTTPUtil : public HTTPFSUtil {
public:
	string GetName() const override {
		return "WasmHTTPUtils";
	}
	unique_ptr<HTTPClient> InitializeClient(HTTPParams &http_params, const string &proto_host_port) override {
		auto client = make_uniq<SandboxHTTPClient>();
		client->Initialize(http_params);
		return std::move(client);
	}
};

} // namespace

shared_ptr<HTTPUtil> MakeSandboxHTTPUtil() {
	return make_shared_ptr<SandboxHTTPUtil>();
}

} // namespace duckdb
