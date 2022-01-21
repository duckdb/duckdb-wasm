import * as duckdb from '../src/';
import {S3Params, S3PayloadParams, createS3Headers, uriEncode, getHTTPUrl} from '../src/utils'
import {AsyncDuckDBConnection, DuckDBBindings, DuckDBBindingsBase, DuckDBModule} from "../src/";
import BROWSER_RUNTIME from "../src/bindings/runtime_browser";

// S3 config for tests
const BUCKET_NAME       = 'test-bucket';
const ACCESS_KEY_ID     = 'S3RVER';
const ACCESS_KEY_SECRET = 'S3RVER';
const S3_ENDPOINT       = 'http://localhost:4923';

enum AWSConfigType {
    EMPTY,
    VALID,
    INVALID
}
const setAwsConfig = async function (conn : AsyncDuckDBConnection, type : AWSConfigType = AWSConfigType.VALID) {
    switch(type) {
        case AWSConfigType.EMPTY:
            await conn.query("SET s3_region='';");
            await conn.query("SET s3_access_key_id='';");
            await conn.query("SET s3_secret_access_key='';");
            await conn.query("SET s3_session_token='';");
            await conn.query(`SET s3_endpoint='${S3_ENDPOINT}';`);
            break;
        case AWSConfigType.VALID:
            await conn.query("SET s3_region='eu-west-1';");
            await conn.query(`SET s3_access_key_id='${ACCESS_KEY_ID}';`);
            await conn.query(`SET s3_secret_access_key='${ACCESS_KEY_SECRET}';`);
            await conn.query("SET s3_session_token='';");
            await conn.query(`SET s3_endpoint='${S3_ENDPOINT}';`);
            break;
        case AWSConfigType.INVALID:
            await conn.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
            await conn.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
            await conn.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
            await conn.query("SET s3_session_token='INVALIDSESSIONTOKEN';");
            await conn.query(`SET s3_endpoint='${S3_ENDPOINT}';`);
            break;
    }
}

export function testHTTPFS(adb: () => duckdb.AsyncDuckDB, sdb: () => duckdb.DuckDBBindings, resolveData: (url: string) => Promise<Uint8Array | null>,  baseDir: string): void {
    let conn_async: duckdb.AsyncDuckDBConnection | null;
    let conn_sync: duckdb.DuckDBConnection | null;
    let test_data_small: Uint8Array | null;
    let test_data_large: Uint8Array | null;

    // PUTs an S3 file to the S3 test server
    const putTestFileToS3 = async function (fileName : string, format: string, test_data : Uint8Array | null) {
        await adb().registerFileBuffer('test_file.parquet', test_data!);
        if (!conn_async) {
            conn_async = await adb().connect();
        }
        await setAwsConfig(conn_async, AWSConfigType.VALID);

        await conn_async.send(`CREATE TABLE test_table AS (SELECT * FROM parquet_scan('test_file.parquet'));`);
        await conn_async.query(`COPY test_table TO 's3://${BUCKET_NAME}/${fileName}.${format}' (FORMAT '${format}');`);

        await adb().flushFiles();
        await adb().dropFiles();
    }

    // Requires an open conn_async
    const assertTestFileResultCorrect = async function (result: any, test_data : Uint8Array | null ) {
        await adb().registerFileBuffer('test_file_baseline.parquet', test_data!);
        const result_baseline = await conn_async!.query(`SELECT * FROM parquet_scan('test_file_baseline.parquet');`);
        expect(result.getColumnAt(0).toArray()).toEqual(result_baseline.getColumnAt(0)?.toArray());
    }

    const getModule = function () {
        if (!conn_sync) {
            conn_sync = sdb().connect();
        }
        let module : DuckDBModule | null = null;
        conn_sync!.useUnsafe((bindings: DuckDBBindings, con_number: number) => {
            module = (bindings as DuckDBBindingsBase).mod;
        });
        expect(module).toBeDefined();
        return module;
    }

    beforeAll(async () => {
        test_data_small = await resolveData('/uni/studenten.parquet');
        test_data_large = await resolveData('/tpch/0_01/parquet/lineitem.parquet');
    });
    afterEach(async () => {
        if (conn_async) {
            adb().flushFiles();
            adb().dropFiles();
            await conn_async.close();
            conn_async = null;
        }
        if (conn_sync) {
            sdb().flushFiles();
            sdb().dropFiles();
            conn_sync.close();
            conn_sync = null;
        }
    });
    describe('HTTPFS', () => {
        it('can fetch https file', async () => {
            await adb().reset();
            conn_async = await adb().connect();
            const results = await conn_async.query(`select * from "https://raw.githubusercontent.com/duckdb/duckdb-wasm/master/data/test.csv";`);
            expect(results.getColumnAt(2)?.get(2)).toEqual(9);
        });

        it('s3 config is set correctly', () => {
            sdb().reset();
            conn_sync = sdb().connect();
            const module = getModule();

            // Default values are empty
            const globalFileInfo = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            const cacheEpoch = globalFileInfo!.cacheEpoch;
            expect(globalFileInfo?.s3Config).toBeDefined();
            expect(globalFileInfo?.s3Config?.region).toEqual("");
            expect(globalFileInfo?.s3Config?.accessKeyId).toEqual("");
            expect(globalFileInfo?.s3Config?.secretAccessKey).toEqual("");
            expect(globalFileInfo?.s3Config?.sessionToken).toEqual("");
            expect(globalFileInfo?.s3Config?.endpoint).toEqual("");

            conn_sync.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
            conn_sync.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
            conn_sync.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
            conn_sync.query("SET s3_session_token='ANICESESSIONTOKEN';");
            conn_sync.query("SET s3_endpoint='localhost:1337';");
            const globalFileInfoUpdated = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoUpdated?.s3Config).toBeDefined();
            expect(globalFileInfoUpdated?.s3Config?.region).toEqual("a-very-remote-and-non-existent-s3-region");
            expect(globalFileInfoUpdated?.s3Config?.accessKeyId).toEqual("THISACCESSKEYIDISNOTVALID");
            expect(globalFileInfoUpdated?.s3Config?.secretAccessKey).toEqual("THISSECRETACCESSKEYISNOTVALID");
            expect(globalFileInfoUpdated?.s3Config?.sessionToken).toEqual("ANICESESSIONTOKEN");
            expect(globalFileInfoUpdated?.s3Config?.endpoint).toEqual("localhost:1337");
            expect(globalFileInfoUpdated?.cacheEpoch).toEqual(cacheEpoch+5);

            // Reset should clear config
            conn_sync.close();
            sdb().reset();
            conn_sync = sdb().connect();
            const globalFileInfoAfterReset = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoAfterReset?.s3Config).toBeDefined();
            expect(globalFileInfoAfterReset?.s3Config?.region).toEqual("");
            expect(globalFileInfoAfterReset?.s3Config?.accessKeyId).toEqual("");
            expect(globalFileInfoAfterReset?.s3Config?.secretAccessKey).toEqual("");
            expect(globalFileInfoAfterReset?.s3Config?.sessionToken).toEqual("");
            expect(globalFileInfoAfterReset?.s3Config?.endpoint).toEqual("");
        });

        it('url parsing is correct', () => {
            conn_sync = sdb().connect();
            const module = getModule();

            conn_sync.query("SET s3_endpoint='';");
            const globalFileInfoDefault = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoDefault?.s3Config).toBeDefined();
            const defaultUrl = getHTTPUrl(globalFileInfoDefault?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
            expect(defaultUrl).toEqual(`https://${BUCKET_NAME}.s3.amazonaws.com/test-file.csv`);

            conn_sync.query("SET s3_endpoint='https://duckdblabs.com';");
            const globalFileInfoFullUrl = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoFullUrl?.s3Config).toBeDefined();
            const fullUrl = getHTTPUrl(globalFileInfoFullUrl?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
            expect(fullUrl).toEqual(`https://duckdblabs.com/${BUCKET_NAME}/test-file.csv`);

            conn_sync.query("SET s3_endpoint='duckdblabs.com';");
            const globalFileInfoDomain = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoDomain?.s3Config).toBeDefined();
            const domainOnlyUrl = getHTTPUrl(globalFileInfoDomain?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
            expect(domainOnlyUrl).toEqual(`https://${BUCKET_NAME}.duckdblabs.com/test-file.csv`);
        });

        it('can read and write csv file from S3 with correct auth credentials', async () => {
            conn_async = await adb().connect();

            await setAwsConfig(conn_async);
            await putTestFileToS3('correct_auth_test', 'csv', test_data_small);
            const results_with_auth = await conn_async.query(`select * from "s3://${BUCKET_NAME}/correct_auth_test.csv";`);
            assertTestFileResultCorrect(results_with_auth, test_data_small);
        });

        it('can read and write parquet file from S3 with correct auth credentials', async () => {
            conn_async = await adb().connect();
            await putTestFileToS3('correct_auth_test', 'parquet', test_data_small);
            await setAwsConfig(conn_async);
            const results_with_auth = await conn_async.query(`select * from "s3://${BUCKET_NAME}/correct_auth_test.parquet";`);
            assertTestFileResultCorrect(results_with_auth, test_data_small);
        });

        it('can not read a file with incorrect credentials', async () => {
            conn_async = await adb().connect();
            await putTestFileToS3('incorrect_auth_test', 'parquet', test_data_small);
            await setAwsConfig(conn_async, AWSConfigType.INVALID);

            await expectAsync(conn_async.query(`select * from "s3://${BUCKET_NAME}/incorrect_auth_test.csv";`))
                .toBeRejected();
        });

        it('properly invalidates file caches on settings update.', async () => {
            conn_async = await adb().connect();
            await putTestFileToS3('file_cache_invalidation_test', 'parquet', test_data_large);
            await setAwsConfig(conn_async);

            // Query first row of column
            const results_correct = await conn_async.query(`select l_partkey from "s3://${BUCKET_NAME}/file_cache_invalidation_test.parquet" limit 1;`);
            expect(results_correct.getColumnAt(0)?.get(0)).toEqual(1552);

            // Query scanning whole column should fail now
            await setAwsConfig(conn_async, AWSConfigType.INVALID);
            await expectAsync(conn_async!.query(`select avg(l_partkey) from "s3://${BUCKET_NAME}/lineitem.parquet";`))
                .toBeRejected();
        });

        it('write after read throws incorrect flag error without dropping files', async () => {
            conn_async = await adb().connect();
            await setAwsConfig(conn_async);

            // Write the file for the first time
            await conn_async.query(`COPY (SELECT * FROM range(1000,1010) tbl(i)) TO 's3://${BUCKET_NAME}/test_written.csv' (FORMAT 'csv');`);

            // Confirm file matches
            const result = await conn_async.query(`SELECT * FROM "s3://${BUCKET_NAME}/test_written.csv";`);
            expect(result.getColumnAt(0)?.get(6)).toEqual(1006);

            // Write the file for the second time should fail: the read flag will not be set on this file
            await expectAsync(conn_async!.query(`COPY (SELECT * FROM range(2000,2010) tbl(i)) TO 's3://${BUCKET_NAME}/test_written.csv' (FORMAT 'csv');`))
                .toBeRejectedWithError("File is not opened in write mode");
        });

        // validate authorization headers for known requests, based on: https://czak.pl/2015/09/15/s3-rest-api-with-curl.html
        it('s3 helper passes validation', () => {
            const testParams1 : S3Params = {
                url: "/",
                query: "",
                host: "my-precious-bucket.s3.amazonaws.com",
                region: "us-east-1",
                service: "s3",
                method: "GET",
                accessKeyId: "AKIAIOSFODNN7EXAMPLE",
                secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
                sessionToken: "",
                dateNow: "20150915",
                datetimeNow: "20150915T124500Z",
            };
            const result = createS3Headers(testParams1).get("Authorization");
            expect(result).toEqual("AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20150915/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=182072eb53d85c36b2d791a1fa46a12d23454ec1e921b02075c23aee40166d5a");

            const canonical_query_string = "delimiter=%2F&encoding-type=url&list-type=2&prefix="; // aws s3 ls <bucket>
            const testParams2 : S3Params = {
                url: "/",
                query: canonical_query_string,
                host: "my-precious-bucket.s3.eu-west-1.amazonaws.com",
                region: "eu-west-1",
                service: "s3",
                method: "GET",
                accessKeyId: "ASIAYSPIOYDTHTBIITVC",
                secretAccessKey: "vs1BZPxSL2qVARBSg5vCMKJsavCoEPlo/HSHRaVe",
                sessionToken: "IQoJb3JpZ2luX2VjENX//////////wEaCWV1LXdlc3QtMSJHMEUCIQDfjzs9BYHrEXDMU/NR+PHV1uSTr7CSVSQdjKSfiPRLdgIgCCztF0VMbi9+uHHAfBVKhV4t9MlUrQg3VAOIsLxrWyoqlAIIHRAAGgw1ODk0MzQ4OTY2MTQiDOGl2DsYxENcKCbh+irxARe91faI+hwUhT60sMGRFg0GWefKnPclH4uRFzczrDOcJlAAaQRJ7KOsT8BrJlrY1jSgjkO7PkVjPp92vi6lJX77bg99MkUTJActiOKmd84XvAE5bFc/jFbqechtBjXzopAPkKsGuaqAhCenXnFt6cwq+LZikv/NJGVw7TRphLV+Aq9PSL9XwdzIgsW2qXwe1c3rxDNj53yStRZHVggdxJ0OgHx5v040c98gFphzSULHyg0OY6wmCMTYcswpb4kO2IIi6AiD9cY25TlwPKRKPi5CdBsTPnyTeW62u7PvwK0fTSy4ZuJUuGKQnH2cKmCXquEwoOHEiQY6nQH9fzY/EDGHMRxWWhxu0HiqIfsuFqC7GS0p0ToKQE+pzNsvVwMjZc+KILIDDQpdCWRIwu53I5PZy2Cvk+3y4XLvdZKQCsAKqeOc4c94UAS4NmUT7mCDOuRV0cLBVM8F0JYBGrUxyI+YoIvHhQWmnRLuKgTb5PkF7ZWrXBHFWG5/tZDOvBbbaCWTlRCL9b0Vpg5+BM/81xd8jChP4w83",
                dateNow: "20210904",
                datetimeNow: "20210904T121746Z",
            };
            const result2 = createS3Headers(testParams2).get("Authorization");
            expect(result2).toEqual("AWS4-HMAC-SHA256 Credential=ASIAYSPIOYDTHTBIITVC/20210904/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4d9d6b59d7836b6485f6ad822de97be40287da30347d83042ea7fbed530dc4c0");

            const testParams3 : S3Params = {
                url: "/correct_auth_test.csv",
                query: "",
                host: "test-bucket-ceiveran.s3.amazonaws.com",
                region: "eu-west-1",
                service: "s3",
                method: "PUT",
                accessKeyId: "S3RVER",
                secretAccessKey: "S3RVER",
                sessionToken: "",
                dateNow: "20220121",
                datetimeNow: "20220121T141452Z",
            };
            const test3PayloadParams : S3PayloadParams = {
                contentHash: "28a0cf6ac5c4cb73793091fe6ecc6a68bf90855ac9186158748158f50241bb0c",
                contentType: "text/data;charset=utf-8"
            }
            const result3 = createS3Headers(testParams3, test3PayloadParams).get("Authorization");
            expect(result3).toEqual("AWS4-HMAC-SHA256 Credential=S3RVER/20220121/eu-west-1/s3/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=5d9a6cbfaa78a6d0f2ab7df0445e2f1cc9c80cd3655ac7de9e7219c036f23f02");

            expect(uriEncode("/category=Books/")).toEqual("/category%3DBooks/");
            expect(uriEncode("/?category=Books&title=Ducks Retreat/")).toEqual("/%3Fcategory%3DBooks%26title%3DDucks%20Retreat/");
            expect(uriEncode("/?category=Books&title=Ducks Retreat/", true)).toEqual("%2F%3Fcategory%3DBooks%26title%3DDucks%20Retreat%2F");
        });
    });
}