#include "duckdb/common/file_opener.hpp"
#include "duckdb/common/http_util.hpp"
#include "duckdb/main/secret/secret.hpp"

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
    bool s3_version_id_pinning{false};
    shared_ptr<HTTPState> state;
    string user_agent = {""};
    bool pre_merged_headers = false;
    idx_t force_download_threshold = 0;

    // Additional fields needs to be appended at the end and need to be propagated from duckdb-httpfs
    // TODO: make this unnecessary
};

static string TryGetPrefix(const string &url) {
    const string prefixes[] = {"s3://", "s3a://", "s3n://", "gcs://", "gs://", "r2://"};
    for (auto &prefix : prefixes) {
        if (StringUtil::StartsWith(StringUtil::Lower(url), prefix)) {
            return prefix;
        }
    }
    return {};
}

class HTTPWasmUtil : public HTTPUtil {
   public:
    unique_ptr<HTTPParams> InitializeParameters(optional_ptr<FileOpener> opener,
                                                optional_ptr<FileOpenerInfo> info) override {
        auto result = make_uniq<HTTPFSParams>(*this);
        result->Initialize(opener);
        // result->state = HTTPState::TryGetState(opener);

        // No point in continuing without an opener
        if (!opener) {
            return std::move(result);
        }

        Value value;

        // Setting lookups
        FileOpener::TryGetCurrentSetting(opener, "http_timeout", result->timeout, info);
        FileOpener::TryGetCurrentSetting(opener, "force_download", result->force_download, info);
        FileOpener::TryGetCurrentSetting(opener, "force_download_threshold", result->force_download_threshold, info);
        FileOpener::TryGetCurrentSetting(opener, "auto_fallback_to_full_download",
                                         result->auto_fallback_to_full_download, info);
        FileOpener::TryGetCurrentSetting(opener, "http_retries", result->retries, info);
        FileOpener::TryGetCurrentSetting(opener, "http_retry_wait_ms", result->retry_wait_ms, info);
        FileOpener::TryGetCurrentSetting(opener, "http_retry_backoff", result->retry_backoff, info);
        FileOpener::TryGetCurrentSetting(opener, "http_keep_alive", result->keep_alive, info);
        FileOpener::TryGetCurrentSetting(opener, "enable_curl_server_cert_verification",
                                         result->enable_curl_server_cert_verification, info);
        FileOpener::TryGetCurrentSetting(opener, "enable_server_cert_verification",
                                         result->enable_server_cert_verification, info);
        FileOpener::TryGetCurrentSetting(opener, "ca_cert_file", result->ca_cert_file, info);
        FileOpener::TryGetCurrentSetting(opener, "hf_max_per_page", result->hf_max_per_page, info);
        FileOpener::TryGetCurrentSetting(opener, "unsafe_disable_etag_checks", result->unsafe_disable_etag_checks,
                                         info);
        FileOpener::TryGetCurrentSetting(opener, "s3_version_id_pinning", result->s3_version_id_pinning, info);

        unique_ptr<KeyValueSecretReader> settings_reader;

        if (info && !TryGetPrefix(info->file_path).empty()) {
            // This is an S3-type url, we should
            const char *s3_secret_types[] = {"s3", "r2", "gcs", "aws", "http"};

            idx_t secret_type_count = 5;
            Value merge_http_secret_into_s3_request;
            FileOpener::TryGetCurrentSetting(opener, "merge_http_secret_into_s3_request",
                                             merge_http_secret_into_s3_request);

            if (!merge_http_secret_into_s3_request.IsNull() && !merge_http_secret_into_s3_request.GetValue<bool>()) {
                // Drop the http secret from the lookup
                secret_type_count = 4;
            }
            settings_reader = make_uniq<KeyValueSecretReader>(*opener, info, s3_secret_types, secret_type_count);
        } else {
            settings_reader = make_uniq<KeyValueSecretReader>(*opener, info, "http");
        }

        // HTTP Secret lookups

        string proxy_setting;
        if (settings_reader->TryGetSecretKey<string>("http_proxy", proxy_setting) && !proxy_setting.empty()) {
            idx_t port;
            string host;
            HTTPUtil::ParseHTTPProxyHost(proxy_setting, host, port);
            result->http_proxy = host;
            result->http_proxy_port = port;
        }
        result->override_verify_ssl = settings_reader->TryGetSecretKey<bool>("verify_ssl", result->verify_ssl);
        settings_reader->TryGetSecretKey<string>("http_proxy_username", result->http_proxy_username);
        settings_reader->TryGetSecretKey<string>("http_proxy_password", result->http_proxy_password);
        settings_reader->TryGetSecretKey<string>("bearer_token", result->bearer_token);

        Value extra_headers;
        if (settings_reader->TryGetSecretKey("extra_http_headers", extra_headers)) {
            auto children = MapValue::GetChildren(extra_headers);
            for (const auto &child : children) {
                auto kv = StructValue::GetChildren(child);
                D_ASSERT(kv.size() == 2);
                result->extra_headers[kv[0].GetValue<string>()] = kv[1].GetValue<string>();
            }
        }

        return std::move(result);
    }
    unique_ptr<HTTPClient> InitializeClient(HTTPParams &http_params, const string &proto_host_port) override;

    // static unordered_map<string, string> ParseGetParameters(const string &text);

    string GetName() const override;
};

}  // namespace duckdb
