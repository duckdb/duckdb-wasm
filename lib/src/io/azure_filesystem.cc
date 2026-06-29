#include "duckdb/web/io/azure_filesystem.h"

#include "duckdb/common/exception.hpp"
#include "duckdb/common/file_opener.hpp"
#include "duckdb/common/string_util.hpp"
#include "duckdb/main/client_context.hpp"
#include "duckdb/main/database.hpp"
#include "duckdb/main/secret/secret.hpp"
#include "duckdb/main/secret/secret_manager.hpp"
#include "duckdb/web/io/web_filesystem.h"

namespace duckdb {
namespace web {
namespace io {

namespace {

/// The Azure URL schemes we transparently read over HTTPS.
/// `abfss`/`abfs`/`wasbs`/`wasb` embed the account in the host (`container@account.<host>`);
/// `az`/`azure` do not, so their account comes from the secret.
const char *AZURE_SCHEMES[] = {"abfss://", "abfs://", "az://", "azure://", "wasbs://", "wasb://"};

/// Read the value of `key` (up to the next ';') from an Azure connection string.
std::string ConnectionStringValue(const std::string &connection_string, const std::string &key) {
    auto pos = connection_string.find(key);
    if (pos == std::string::npos) {
        return "";
    }
    std::string value = connection_string.substr(pos + key.size());
    auto semicolon = value.find(';');
    if (semicolon != std::string::npos) {
        value = value.substr(0, semicolon);
    }
    return value;
}

/// Build the `azure` secret from the options the Iceberg extension passes to CREATE SECRET.
unique_ptr<BaseSecret> CreateAzureSecretFromConfig(ClientContext &, CreateSecretInput &input) {
    auto secret = make_uniq<KeyValueSecret>(input.scope, input.type, input.provider, input.name);
    secret->TrySetValue("account_name", input);
    secret->TrySetValue("connection_string", input);
    secret->redact_keys = {"connection_string"};
    return std::move(secret);
}

}  // namespace

bool AzureFileSystem::IsAzureURL(const std::string &path) {
    for (auto *scheme : AZURE_SCHEMES) {
        if (StringUtil::StartsWith(path, scheme)) {
            return true;
        }
    }
    return false;
}

bool AzureFileSystem::ParseAzureURL(const std::string &path, UrlParts &out) {
    auto scheme_end = path.find("://");
    if (scheme_end == std::string::npos) {
        return false;
    }
    std::string scheme = path.substr(0, scheme_end);
    std::string rest = path.substr(scheme_end + 3);

    bool host_based = scheme == "abfss" || scheme == "abfs" || scheme == "wasbs" || scheme == "wasb";
    bool account_less = scheme == "az" || scheme == "azure";
    if (!host_based && !account_less) {
        return false;
    }

    out = UrlParts{};
    if (host_based) {
        // container@account.<host>/key
        auto at = rest.find('@');
        if (at == std::string::npos) {
            return false;
        }
        out.container = rest.substr(0, at);
        std::string host_and_path = rest.substr(at + 1);
        auto slash = host_and_path.find('/');
        std::string host = slash == std::string::npos ? host_and_path : host_and_path.substr(0, slash);
        out.key = slash == std::string::npos ? "" : host_and_path.substr(slash + 1);
        out.host = host;
        auto dot = host.find('.');
        out.account = dot == std::string::npos ? host : host.substr(0, dot);
    } else {
        // container/key — account is supplied by the secret
        auto slash = rest.find('/');
        out.container = slash == std::string::npos ? rest : rest.substr(0, slash);
        out.key = slash == std::string::npos ? "" : rest.substr(slash + 1);
    }
    return !out.container.empty();
}

std::string AzureFileSystem::ExtractSasToken(const std::string &connection_string) {
    // SAS tokens never contain ';', but they do contain '=' and '&', so the value runs to the end
    // of the "SharedAccessSignature=" segment.
    std::string sas = ConnectionStringValue(connection_string, "SharedAccessSignature=");
    if (!sas.empty() && sas.front() == '?') {
        sas = sas.substr(1);
    }
    return sas;
}

std::string AzureFileSystem::ExtractAccountName(const std::string &connection_string) {
    return ConnectionStringValue(connection_string, "AccountName=");
}

std::string AzureFileSystem::BuildHttpsURL(const std::string &host, const std::string &container,
                                           const std::string &key, const std::string &sas) {
    std::string url = "https://" + host + "/" + container;
    if (!key.empty()) {
        url += "/" + key;
    }
    if (!sas.empty()) {
        url += "?" + sas;
    }
    return url;
}

std::string AzureFileSystem::ResolveHttpsURL(const std::string &path, optional_ptr<FileOpener> opener) {
    UrlParts parts;
    if (!ParseAzureURL(path, parts)) {
        throw IOException("Cannot parse Azure URL '%s'", path);
    }
    if (!opener) {
        throw IOException("Cannot resolve Azure URL '%s': no secret context (file opener) available", path);
    }

    // Look up the `azure` secret scoped to this path (e.g. vended by an Iceberg REST catalog).
    FileOpenerInfo info;
    info.file_path = path;
    const char *secret_type = "azure";
    KeyValueSecretReader secret_reader(*opener, &info, secret_type);

    std::string connection_string;
    secret_reader.TryGetSecretKey<std::string>("connection_string", connection_string);

    std::string account = parts.account;
    if (account.empty()) {
        secret_reader.TryGetSecretKey<std::string>("account_name", account);
    }
    if (account.empty()) {
        account = ExtractAccountName(connection_string);
    }
    std::string sas = ExtractSasToken(connection_string);

    if (account.empty() || sas.empty()) {
        throw IOException(
            "No usable `azure` secret found for '%s'. DuckDB-Wasm reads Azure storage over HTTPS using a SAS "
            "token, so it needs an `azure` secret whose `connection_string` carries a SharedAccessSignature "
            "(e.g. vended by the Iceberg REST catalog).",
            path);
    }
    // Preserve the endpoint host from the URL (abfss -> dfs, wasbs -> blob) so the request stays on
    // the endpoint the SAS was issued for (e.g. a directory SAS `sr=d` is only valid on dfs).
    // Account-less schemes (az://) carry no host; default to the Blob endpoint.
    std::string host = !parts.host.empty() ? parts.host : account + ".blob.core.windows.net";
    return BuildHttpsURL(host, parts.container, parts.key, sas);
}

duckdb::FileSystem &AzureFileSystem::ResolveTargetFileSystem(optional_ptr<FileOpener> opener) {
    // Re-open through the database's filesystem so the rewritten https URL flows through the same
    // buffered read path (FilePageBuffer) as any other https:// file. Callers must pass a null
    // opener: that filesystem is an OpenerFileSystem which pushes the opener itself and rejects an
    // explicit one. Fall back to the web filesystem when there is no database (e.g. in tests).
    auto db = FileOpener::TryGetDatabase(opener);
    if (db) {
        return db->GetFileSystem();
    }
    auto *web_fs = WebFileSystem::Get();
    if (!web_fs) {
        throw IOException("Cannot resolve a target filesystem for Azure URLs");
    }
    return *web_fs;
}

bool AzureFileSystem::CanHandleFile(const string &fpath) { return IsAzureURL(fpath); }

duckdb::unique_ptr<duckdb::FileHandle> AzureFileSystem::OpenFile(const string &path, FileOpenFlags flags,
                                                                 optional_ptr<FileOpener> opener) {
    auto https_url = ResolveHttpsURL(path, opener);
    // Null opener: the target OpenerFileSystem pushes the current opener automatically (and the SAS
    // is already in the URL, so no secret lookup is needed for the https read).
    return ResolveTargetFileSystem(opener).OpenFile(https_url, flags, nullptr);
}

bool AzureFileSystem::FileExists(const string &filename, optional_ptr<FileOpener> opener) {
    auto https_url = ResolveHttpsURL(filename, opener);
    return ResolveTargetFileSystem(opener).FileExists(https_url, nullptr);
}

vector<OpenFileInfo> AzureFileSystem::Glob(const string &path, FileOpener *opener) {
    // Iceberg reads explicit file paths, so globbing Azure URLs is never requested. Fail loudly
    // rather than pretend to glob a single resolved blob.
    (void)opener;
    throw NotImplementedException("Globbing Azure (%s) paths is not supported in DuckDB-Wasm", path);
}

void AzureFileSystem::Register(duckdb::DatabaseInstance &db) {
    // 1) Register a minimal `azure` secret type so the Iceberg extension can stash the SAS token it
    //    vends (CREATE SECRET ... TYPE azure), even though the native `azure` extension is absent.
    auto &secret_manager = db.GetSecretManager();

    SecretType azure_secret_type;
    azure_secret_type.name = "azure";
    azure_secret_type.deserializer = KeyValueSecret::Deserialize<KeyValueSecret>;
    azure_secret_type.default_provider = "config";
    secret_manager.RegisterSecretType(azure_secret_type);

    CreateSecretFunction config_function;
    config_function.secret_type = "azure";
    config_function.provider = "config";
    config_function.function = CreateAzureSecretFromConfig;
    config_function.named_parameters["account_name"] = LogicalType::VARCHAR;
    config_function.named_parameters["connection_string"] = LogicalType::VARCHAR;
    secret_manager.RegisterSecretFunction(config_function, OnCreateConflict::ERROR_ON_CONFLICT);

    // 2) Register the filesystem for the Azure URL schemes. Claiming the schemes also stops DuckDB
    //    from trying (and failing) to autoload the unavailable native `azure` extension.
    db.GetFileSystem().RegisterSubSystem(make_uniq<AzureFileSystem>());
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
