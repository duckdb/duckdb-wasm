#include "duckdb/web/io/azure_filesystem.h"

#include <string>

#include "gtest/gtest.h"

using namespace duckdb::web::io;
using namespace std;

namespace {

TEST(AzureFileSystem, IsAzureURL) {
    EXPECT_TRUE(AzureFileSystem::IsAzureURL("abfss://fs@acc.dfs.core.windows.net/a/b.parquet"));
    EXPECT_TRUE(AzureFileSystem::IsAzureURL("abfs://fs@acc.dfs.core.windows.net/a"));
    EXPECT_TRUE(AzureFileSystem::IsAzureURL("wasbs://fs@acc.blob.core.windows.net/a"));
    EXPECT_TRUE(AzureFileSystem::IsAzureURL("az://container/a/b.parquet"));
    EXPECT_TRUE(AzureFileSystem::IsAzureURL("azure://container/a"));

    EXPECT_FALSE(AzureFileSystem::IsAzureURL("https://acc.blob.core.windows.net/fs/a"));
    EXPECT_FALSE(AzureFileSystem::IsAzureURL("s3://bucket/key"));
    EXPECT_FALSE(AzureFileSystem::IsAzureURL("/local/path"));
}

TEST(AzureFileSystem, ParseHostBasedURL) {
    AzureFileSystem::UrlParts parts;
    ASSERT_TRUE(
        AzureFileSystem::ParseAzureURL("abfss://myfs@myaccount.dfs.core.windows.net/dir/file.parquet", parts));
    EXPECT_EQ(parts.account, "myaccount");
    EXPECT_EQ(parts.host, "myaccount.dfs.core.windows.net");
    EXPECT_EQ(parts.container, "myfs");
    EXPECT_EQ(parts.key, "dir/file.parquet");
}

TEST(AzureFileSystem, ParseAccountLessURL) {
    AzureFileSystem::UrlParts parts;
    ASSERT_TRUE(AzureFileSystem::ParseAzureURL("az://mycontainer/dir/file.parquet", parts));
    EXPECT_EQ(parts.account, "");  // account must come from the secret
    EXPECT_EQ(parts.container, "mycontainer");
    EXPECT_EQ(parts.key, "dir/file.parquet");
}

TEST(AzureFileSystem, ParseRejectsNonAzure) {
    AzureFileSystem::UrlParts parts;
    EXPECT_FALSE(AzureFileSystem::ParseAzureURL("https://acc.blob.core.windows.net/fs/a", parts));
    EXPECT_FALSE(AzureFileSystem::ParseAzureURL("no-scheme", parts));
}

TEST(AzureFileSystem, ExtractSasToken) {
    EXPECT_EQ(AzureFileSystem::ExtractSasToken("AccountName=acc;SharedAccessSignature=sv=2022&ss=b&sig=abc%3D"),
              "sv=2022&ss=b&sig=abc%3D");
    // A leading '?' is stripped.
    EXPECT_EQ(AzureFileSystem::ExtractSasToken("AccountName=acc;SharedAccessSignature=?sv=2022&sig=xyz"),
              "sv=2022&sig=xyz");
    // SharedAccessSignature may appear first.
    EXPECT_EQ(AzureFileSystem::ExtractSasToken("SharedAccessSignature=sv=2022&sig=xyz;AccountName=acc"),
              "sv=2022&sig=xyz");
    EXPECT_EQ(AzureFileSystem::ExtractSasToken("AccountName=acc"), "");
}

TEST(AzureFileSystem, ExtractAccountName) {
    EXPECT_EQ(AzureFileSystem::ExtractAccountName("AccountName=acc;SharedAccessSignature=sv=2022"), "acc");
    EXPECT_EQ(AzureFileSystem::ExtractAccountName("SharedAccessSignature=sv=2022"), "");
}

TEST(AzureFileSystem, BuildHttpsURL) {
    EXPECT_EQ(
        AzureFileSystem::BuildHttpsURL("acc.dfs.core.windows.net", "fs", "dir/file.parquet", "sv=2022&sig=xyz"),
        "https://acc.dfs.core.windows.net/fs/dir/file.parquet?sv=2022&sig=xyz");
    // No key, no SAS.
    EXPECT_EQ(AzureFileSystem::BuildHttpsURL("acc.blob.core.windows.net", "fs", "", ""),
              "https://acc.blob.core.windows.net/fs");
}

// End-to-end of the pure rewrite: abfss:// + connection string -> https Blob URL with SAS.
TEST(AzureFileSystem, RewriteHostBasedToHttps) {
    AzureFileSystem::UrlParts parts;
    ASSERT_TRUE(
        AzureFileSystem::ParseAzureURL("abfss://myfs@myaccount.dfs.core.windows.net/dir/file.parquet", parts));
    const string connection_string = "AccountName=myaccount;SharedAccessSignature=sv=2022&ss=b&sig=abc%3D";
    auto sas = AzureFileSystem::ExtractSasToken(connection_string);
    // Host preserved from the abfss URL (dfs endpoint), so a directory SAS stays valid.
    auto url = AzureFileSystem::BuildHttpsURL(parts.host, parts.container, parts.key, sas);
    EXPECT_EQ(url, "https://myaccount.dfs.core.windows.net/myfs/dir/file.parquet?sv=2022&ss=b&sig=abc%3D");
}

}  // namespace
