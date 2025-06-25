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

    bool force_download = DEFAULT_FORCE_DOWNLOAD;
    bool enable_server_cert_verification = DEFAULT_ENABLE_SERVER_CERT_VERIFICATION;
    idx_t hf_max_per_page = DEFAULT_HF_MAX_PER_PAGE;
    string ca_cert_file;
    string bearer_token;
    shared_ptr<HTTPState> state;
};

class HTTPWasmUtil : public HTTPUtil {
   public:
    unique_ptr<HTTPParams> InitializeParameters(optional_ptr<FileOpener> opener,
                                                optional_ptr<FileOpenerInfo> info) override {
        return make_uniq<HTTPFSParams>(*this);
    }
    unique_ptr<HTTPClient> InitializeClient(HTTPParams &http_params, const string &proto_host_port) override;

    // static unordered_map<string, string> ParseGetParameters(const string &text);

    string GetName() const override;
};

}  // namespace duckdb
