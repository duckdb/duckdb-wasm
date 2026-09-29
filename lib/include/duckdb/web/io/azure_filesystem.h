#ifndef INCLUDE_DUCKDB_WEB_IO_AZURE_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_IO_AZURE_FILESYSTEM_H_

#include <string>

#include "duckdb/common/file_system.hpp"

namespace duckdb {
class DatabaseInstance;
}  // namespace duckdb

namespace duckdb {
namespace web {
namespace io {

/// Makes Azure Blob Storage / ADLS Gen2 URLs readable in DuckDB-Wasm *without* the native `azure`
/// extension (which depends on the Azure C++ SDK and cannot be compiled to Wasm).
///
/// The native flow is: the `azure` extension registers a filesystem for the `abfss://` (and friends)
/// schemes and talks to Azure through the SDK. In Wasm that extension is unavailable, so DuckDB's
/// autoloader fails with "Extension 'azure' is not available" the moment an Iceberg table backed by
/// ADLS is queried.
///
/// This filesystem closes that gap. It claims the Azure URL schemes — which also stops DuckDB from
/// trying to autoload the missing extension — looks up the matching `azure` secret (as vended e.g.
/// by an Iceberg REST catalog: `account_name` + a `connection_string` carrying a SAS token),
/// rewrites the URL to a plain HTTPS Blob URL with the SAS token appended as the query string, and
/// re-opens it through the regular HTTPS path that Wasm already supports via range requests.
///
/// Azure SAS tokens authorize purely via the query string, so — unlike S3 — no request signing is
/// needed; the rewrite is all it takes.
class AzureFileSystem : public duckdb::FileSystem {
   public:
    /// Register the `azure` secret type and this filesystem on a database instance.
    static void Register(duckdb::DatabaseInstance &db);

    /// The parts of an Azure URL needed to build the equivalent HTTPS URL.
    struct UrlParts {
        /// Storage account name. Empty for account-less schemes (`az://`, `azure://`), in which
        /// case it is taken from the secret.
        std::string account;
        /// Full endpoint host carried by the URL, e.g. `acc.dfs.core.windows.net` (abfss) or
        /// `acc.blob.core.windows.net` (wasbs). Empty for account-less schemes. Preserving it keeps
        /// ADLS Gen2 (dfs) and Blob requests on the endpoint their SAS token was issued for.
        std::string host;
        /// Blob container (a.k.a. ADLS filesystem).
        std::string container;
        /// Path of the blob within the container.
        std::string key;
    };

    /// Whether `path` uses an Azure scheme (abfss://, abfs://, az://, azure://, wasbs://, wasb://).
    static bool IsAzureURL(const std::string &path);
    /// Parse an Azure URL into its parts. Returns false if `path` is not an Azure URL.
    static bool ParseAzureURL(const std::string &path, UrlParts &out);
    /// Extract the SAS token from an Azure `connection_string` ("...;SharedAccessSignature=<sas>").
    /// Any leading '?' is stripped. Returns an empty string if absent.
    static std::string ExtractSasToken(const std::string &connection_string);
    /// Extract the account name from an Azure `connection_string` ("AccountName=<acc>;...").
    static std::string ExtractAccountName(const std::string &connection_string);
    /// Build `https://<host>/<container>/<key>?<sas>` (host e.g. `acc.dfs.core.windows.net`).
    static std::string BuildHttpsURL(const std::string &host, const std::string &container,
                                     const std::string &key, const std::string &sas);

    bool CanHandleFile(const string &fpath) override;
    duckdb::unique_ptr<duckdb::FileHandle> OpenFile(const string &path, FileOpenFlags flags,
                                                    optional_ptr<FileOpener> opener) override;
    bool FileExists(const string &filename, optional_ptr<FileOpener> opener = nullptr) override;
    vector<OpenFileInfo> Glob(const string &path, FileOpener *opener = nullptr) override;
    std::string GetName() const override { return "AzureFileSystem"; }

   private:
    /// Resolve an Azure URL to an HTTPS Blob URL with the SAS token of the matching `azure` secret.
    /// Throws a descriptive error if no usable secret is found.
    static std::string ResolveHttpsURL(const std::string &path, optional_ptr<FileOpener> opener);
    /// Re-open `path` (after resolving it to HTTPS) through the regular virtual filesystem so it
    /// flows through the same buffered HTTPS read path as any other https:// file.
    static duckdb::FileSystem &ResolveTargetFileSystem(optional_ptr<FileOpener> opener);
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_IO_AZURE_FILESYSTEM_H_
