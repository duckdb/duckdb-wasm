#include "duckdb/common/http_util.hpp"

namespace duckdb {

class HTTPLogger;
class FileOpener;
struct FileOpenerInfo;
class HTTPState;

struct HTTPFSParams : public HTTPParams {
    HTTPFSParams(HTTPUtil &http_util) : HTTPParams(http_util) {}

    static constexpr bool DEFAULT_ENABLE_SERVER_CERT_VERIFICATION = false;
    static constexpr uint64_t DEFAULT_HF_MAX_PER_PAGE = 0;
    static constexpr bool DEFAULT_FORCE_DOWNLOAD = false;
    static constexpr bool AUTO_FALLBACK_TO_FULL_DOWNLOAD = true;

    bool force_download = DEFAULT_FORCE_DOWNLOAD;
    bool auto_fallback_to_full_download = AUTO_FALLBACK_TO_FULL_DOWNLOAD;
    bool enable_server_cert_verification = DEFAULT_ENABLE_SERVER_CERT_VERIFICATION;
    bool enable_curl_server_cert_verification = true;
    idx_t hf_max_per_page = DEFAULT_HF_MAX_PER_PAGE;
    string ca_cert_file;
    string bearer_token;
    bool unsafe_disable_etag_checks{false};
    shared_ptr<HTTPState> state;
    string user_agent = {""};
    // Additional fields needs to be appended at the end and need to be propagated from duckdb-httpfs
    // TODO: make this unnecessary
};

class HTTPWasmUtil : public HTTPUtil {
   public:
    unique_ptr<HTTPParams> InitializeParameters(optional_ptr<FileOpener> opener,
                                                optional_ptr<FileOpenerInfo> info) override {
        auto result = make_uniq<HTTPFSParams>(*this);
        result->Initialize(opener);
        return result;
    }
    unique_ptr<HTTPClient> InitializeClient(HTTPParams &http_params, const string &proto_host_port) override;

    // static unordered_map<string, string> ParseGetParameters(const string &text);

    string GetName() const override;
};

}  // namespace duckdb
