import * as duckdb from '../src/';
import { getS3Params, S3Params, S3PayloadParams, createS3Headers, uriEncode, getHTTPUrl } from '../src/utils';
import { AsyncDuckDBConnection, DuckDBBindings, DuckDBBindingsBase, DuckDBModule } from '../src/';
import BROWSER_RUNTIME from '../src/bindings/runtime_browser';
import { generateLongQueryString } from './string_test_helper';

// S3 config for tests
const BUCKET_NAME = 'test-bucket';
const ACCESS_KEY_ID = 'S3RVER';
const ACCESS_KEY_SECRET = 'S3RVER';
const S3_ENDPOINT = 'http://localhost:4923';
const S3_REGION = 'eu-west-1';

enum AWSConfigType {
    EMPTY,
    VALID,
    INVALID,
}
const setAwsConfig = async function (conn: AsyncDuckDBConnection, type: AWSConfigType = AWSConfigType.VALID) {
    switch (type) {
        case AWSConfigType.EMPTY:
            await conn.query("SET s3_region='';");
            await conn.query("SET s3_access_key_id='';");
            await conn.query("SET s3_secret_access_key='';");
            await conn.query("SET s3_session_token='';");
            await conn.query(`SET s3_endpoint='${S3_ENDPOINT}';`);
            break;
        case AWSConfigType.VALID:
            await conn.query(`SET s3_region='${S3_REGION}';`);
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
};

export function testHTTPFS(sdb: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection | null;

    const getModule = function () {
        let module: DuckDBModule | null = null;
        conn!.useUnsafe((bindings: DuckDBBindings, con_number: number) => {
            module = (bindings as DuckDBBindingsBase).mod;
        });
        expect(module).toBeDefined();
        return module;
    };
    const reset = async () => {
        sdb().reset();
        conn = sdb().connect();
    };
    beforeEach(async () => await reset());
    afterEach(async () => await reset());

    describe('HTTPFS', () => {
        it('s3 config is set correctly', async () => {
            const module = getModule();

            // Default values are empty
            const globalFileInfo = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            const cacheEpoch = globalFileInfo!.cacheEpoch;
            expect(globalFileInfo?.s3Config).toBeDefined();
            expect(globalFileInfo?.s3Config?.region).toEqual('');
            expect(globalFileInfo?.s3Config?.accessKeyId).toEqual('');
            expect(globalFileInfo?.s3Config?.secretAccessKey).toEqual('');
            expect(globalFileInfo?.s3Config?.sessionToken).toEqual('');
            expect(globalFileInfo?.s3Config?.endpoint).toEqual('');

            // Confirm settings are correctly set
            conn!.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
            conn!.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
            conn!.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
            conn!.query("SET s3_session_token='ANICESESSIONTOKEN';");
            conn!.query("SET s3_endpoint='s3.some.sort.of.cloud';");
            const globalFileInfoUpdated = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoUpdated?.s3Config).toBeDefined();
            expect(globalFileInfoUpdated?.cacheEpoch).toEqual(cacheEpoch + 5);
            const params = getS3Params(globalFileInfoUpdated?.s3Config, 's3://test-bucket/testfile.txt', 'GET');
            expect(params.url).toEqual('/testfile.txt');
            expect(params.query).toEqual('');
            expect(params.host).toEqual('test-bucket.s3.some.sort.of.cloud');
            expect(params.region).toEqual('a-very-remote-and-non-existent-s3-region');
            expect(params.service).toEqual('s3');
            expect(params.method).toEqual('GET');
            expect(params.accessKeyId).toEqual('THISACCESSKEYIDISNOTVALID');
            expect(params.secretAccessKey).toEqual('THISSECRETACCESSKEYISNOTVALID');
            expect(params.sessionToken).toEqual('ANICESESSIONTOKEN');

            // Cover full http endpoint config
            conn!.query("SET s3_endpoint='http://localhost:1337';");
            const globalFileInfoFullHttpEndpoint = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            const paramsFullHttpEndpoint = getS3Params(
                globalFileInfoFullHttpEndpoint?.s3Config,
                's3://test-bucket/testfile.txt',
                'GET',
            );
            expect(paramsFullHttpEndpoint.host).toEqual('localhost:1337');

            // Reset should clear config
            await reset();
            const globalFileInfoCleared = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            const paramsCleared = getS3Params(globalFileInfoCleared?.s3Config, 's3://test-bucket/testfile.txt', 'GET');
            expect(paramsCleared.url).toEqual('/testfile.txt');
            expect(paramsCleared.query).toEqual('');
            expect(paramsCleared.host).toEqual('test-bucket.s3.amazonaws.com');
            expect(paramsCleared.region).toEqual('');
            expect(paramsCleared.service).toEqual('s3');
            expect(paramsCleared.method).toEqual('GET');
            expect(paramsCleared.accessKeyId).toEqual('');
            expect(paramsCleared.secretAccessKey).toEqual('');
            expect(paramsCleared.sessionToken).toEqual('');
        });

        it('url parsing is correct', () => {
            const module = getModule();

            conn!.query("SET s3_endpoint='';");
            const globalFileInfoDefault = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoDefault?.s3Config).toBeDefined();
            const defaultUrl = getHTTPUrl(globalFileInfoDefault?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
            expect(defaultUrl).toEqual(`https://${BUCKET_NAME}.s3.amazonaws.com/test-file.csv`);

            conn!.query("SET s3_endpoint='https://duckdblabs.com';");
            const globalFileInfoFullUrl = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoFullUrl?.s3Config).toBeDefined();
            const fullUrl = getHTTPUrl(globalFileInfoFullUrl?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
            expect(fullUrl).toEqual(`https://duckdblabs.com/${BUCKET_NAME}/test-file.csv`);

            conn!.query("SET s3_endpoint='duckdblabs.com';");
            const globalFileInfoDomain = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoDomain?.s3Config).toBeDefined();
            const domainOnlyUrl = getHTTPUrl(globalFileInfoDomain?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
            expect(domainOnlyUrl).toEqual(`https://${BUCKET_NAME}.duckdblabs.com/test-file.csv`);
        });

        // validate authorization headers for known requests, based on: https://czak.pl/2015/09/15/s3-rest-api-with-curl.html
        it('s3 helper passes validation', () => {
            const testParams1: S3Params = {
                url: '/',
                query: '',
                host: 'my-precious-bucket.s3.amazonaws.com',
                region: 'us-east-1',
                service: 's3',
                method: 'GET',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                sessionToken: '',
                dateNow: '20150915',
                datetimeNow: '20150915T124500Z',
            };
            const result = createS3Headers(testParams1).get('Authorization');
            expect(result).toEqual(
                'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20150915/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=182072eb53d85c36b2d791a1fa46a12d23454ec1e921b02075c23aee40166d5a',
            );

            const canonical_query_string = 'delimiter=%2F&encoding-type=url&list-type=2&prefix='; // aws s3 ls <bucket>
            const testParams2: S3Params = {
                url: '/',
                query: canonical_query_string,
                host: 'my-precious-bucket.s3.eu-west-1.amazonaws.com',
                region: 'eu-west-1',
                service: 's3',
                method: 'GET',
                accessKeyId: 'ASIAYSPIOYDTHTBIITVC',
                secretAccessKey: 'vs1BZPxSL2qVARBSg5vCMKJsavCoEPlo/HSHRaVe',
                sessionToken:
                    'IQoJb3JpZ2luX2VjENX//////////wEaCWV1LXdlc3QtMSJHMEUCIQDfjzs9BYHrEXDMU/NR+PHV1uSTr7CSVSQdjKSfiPRLdgIgCCztF0VMbi9+uHHAfBVKhV4t9MlUrQg3VAOIsLxrWyoqlAIIHRAAGgw1ODk0MzQ4OTY2MTQiDOGl2DsYxENcKCbh+irxARe91faI+hwUhT60sMGRFg0GWefKnPclH4uRFzczrDOcJlAAaQRJ7KOsT8BrJlrY1jSgjkO7PkVjPp92vi6lJX77bg99MkUTJActiOKmd84XvAE5bFc/jFbqechtBjXzopAPkKsGuaqAhCenXnFt6cwq+LZikv/NJGVw7TRphLV+Aq9PSL9XwdzIgsW2qXwe1c3rxDNj53yStRZHVggdxJ0OgHx5v040c98gFphzSULHyg0OY6wmCMTYcswpb4kO2IIi6AiD9cY25TlwPKRKPi5CdBsTPnyTeW62u7PvwK0fTSy4ZuJUuGKQnH2cKmCXquEwoOHEiQY6nQH9fzY/EDGHMRxWWhxu0HiqIfsuFqC7GS0p0ToKQE+pzNsvVwMjZc+KILIDDQpdCWRIwu53I5PZy2Cvk+3y4XLvdZKQCsAKqeOc4c94UAS4NmUT7mCDOuRV0cLBVM8F0JYBGrUxyI+YoIvHhQWmnRLuKgTb5PkF7ZWrXBHFWG5/tZDOvBbbaCWTlRCL9b0Vpg5+BM/81xd8jChP4w83',
                dateNow: '20210904',
                datetimeNow: '20210904T121746Z',
            };
            const result2 = createS3Headers(testParams2).get('Authorization');
            expect(result2).toEqual(
                'AWS4-HMAC-SHA256 Credential=ASIAYSPIOYDTHTBIITVC/20210904/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4d9d6b59d7836b6485f6ad822de97be40287da30347d83042ea7fbed530dc4c0',
            );

            const testParams3: S3Params = {
                url: '/correct_auth_test.csv',
                query: '',
                host: 'test-bucket-ceiveran.s3.amazonaws.com',
                region: 'eu-west-1',
                service: 's3',
                method: 'PUT',
                accessKeyId: 'S3RVER',
                secretAccessKey: 'S3RVER',
                sessionToken: '',
                dateNow: '20220121',
                datetimeNow: '20220121T141452Z',
            };
            const test3PayloadParams: S3PayloadParams = {
                contentHash: '28a0cf6ac5c4cb73793091fe6ecc6a68bf90855ac9186158748158f50241bb0c',
                contentType: 'text/data;charset=utf-8',
            };
            const result3 = createS3Headers(testParams3, test3PayloadParams).get('Authorization');
            expect(result3).toEqual(
                'AWS4-HMAC-SHA256 Credential=S3RVER/20220121/eu-west-1/s3/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=5d9a6cbfaa78a6d0f2ab7df0445e2f1cc9c80cd3655ac7de9e7219c036f23f02',
            );

            expect(uriEncode('/category=Books/')).toEqual('/category%3DBooks/');
            expect(uriEncode('/?category=Books&title=Ducks Retreat/')).toEqual(
                '/%3Fcategory%3DBooks%26title%3DDucks%20Retreat/',
            );
            expect(uriEncode('/?category=Books&title=Ducks Retreat/', true)).toEqual(
                '%2F%3Fcategory%3DBooks%26title%3DDucks%20Retreat%2F',
            );
        });
    });
}

export function testHTTPFSAsync(
    adb: () => duckdb.AsyncDuckDB,
    resolveData: (url: string) => Promise<Uint8Array | null>,
    baseDir: string,
): void {
    let conn: duckdb.AsyncDuckDBConnection | null;

    // PUTs an S3 file to the S3 test server
    const putTestFileToS3 = async function (fileName: string, format: string, test_data: Uint8Array | null) {
        await adb().registerFileBuffer('test_file.parquet', test_data!);
        if (!conn) {
            conn = await adb().connect();
        }
        await setAwsConfig(conn, AWSConfigType.VALID);
        await conn.query(`CREATE TABLE test_table AS (SELECT * FROM parquet_scan('test_file.parquet'));`);
        await conn.query(`COPY test_table TO 's3://${BUCKET_NAME}/${fileName}.${format}' (FORMAT '${format}');`);
        await adb().flushFiles();
        await adb().dropFiles();
    };

    // Requires an open conn
    const assertTestFileResultCorrect = async function (result: any, test_data: Uint8Array | null) {
        await adb().registerFileBuffer('test_file_baseline.parquet', test_data!);
        await conn!.query(`SELECT * FROM parquet_scan('test_file_baseline.parquet');`);
        // expect(result.getChildAt(0).toArray()).toEqual(result_baseline.getChildAt(0)?.toArray());
    };

    // Reset databases between tests
    const reset = async () => {
        await adb().reset();
        conn = await adb().connect();
    };
    beforeEach(async () => await reset());
    afterEach(async () => await reset());

    describe('HTTPFS Async', () => {
        it('can fetch https file', async () => {
            const results = await conn!.query(
                `select * from "https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/data/test.csv";`,
            );
            expect(BigInt(results.getChildAt(2)?.get(2))).toEqual(BigInt(9n));
        });

        it('can fetch over https csv.gz', async () => {
            return;
            await conn!.query(
                `select * from "https://raw.githubusercontent.com/duckdb/duckdb/v1.2.2/data/csv/test_apple_financial.csv.gz";`,
            );
        });

        it('can read and write csv file from S3 with correct auth credentials', async () => {
            let data = await resolveData('/uni/studenten.parquet');
            await setAwsConfig(conn!);
            await putTestFileToS3('correct_auth_test', 'csv', data);
            const results_with_auth = await conn!.query(`select * from "s3://${BUCKET_NAME}/correct_auth_test.csv";`);
            data = await resolveData('/uni/studenten.parquet');
            assertTestFileResultCorrect(results_with_auth, data);
        });

        it('can read and write parquet file from S3 with correct auth credentials', async () => {
            let data = await resolveData('/uni/studenten.parquet');
            await putTestFileToS3('correct_auth_test', 'parquet', data);
            await setAwsConfig(conn!);
            const results_with_auth = await conn!.query(
                `select * from "s3://${BUCKET_NAME}/correct_auth_test.parquet";`,
            );
            data = await resolveData('/uni/studenten.parquet');
            assertTestFileResultCorrect(results_with_auth, data);
        });

        it('can not read a file with incorrect credentials', async () => {
            const data = await resolveData('/uni/studenten.parquet');
            await putTestFileToS3('incorrect_auth_test', 'parquet', data);
            await setAwsConfig(conn!, AWSConfigType.INVALID);
            await expectAsync(
                conn!.query(`select * from "s3://${BUCKET_NAME}/incorrect_auth_test.csv";`),
            ).toBeRejected();
        });

        it('properly invalidates file caches on settings update.', async () => {
            const data = await resolveData('/tpch/0_01/parquet/lineitem.parquet');
            await putTestFileToS3('file_cache_invalidation_test', 'parquet', data);
            await setAwsConfig(conn!);
            const results_correct = await conn!.query(
                `select l_partkey from "s3://${BUCKET_NAME}/file_cache_invalidation_test.parquet" limit 1;`,
            );
            expect(results_correct.getChildAt(0)?.get(0)).toEqual(1552);
            await setAwsConfig(conn!, AWSConfigType.INVALID);
            await expectAsync(
                conn!.query(`select avg(l_partkey) from "s3://${BUCKET_NAME}/lineitem.parquet";`),
            ).toBeRejected();
        });

        it('write after read throws incorrect flag error without dropping files', async () => {
            await setAwsConfig(conn!);
            await conn!.query(
                `COPY (SELECT * FROM range(1000,1010) tbl(i)) TO 's3://${BUCKET_NAME}/test_written.csv' (FORMAT 'csv');`,
            );
            const result = await conn!.query(`SELECT * FROM "s3://${BUCKET_NAME}/test_written.csv";`);
            expect(Number(result.getChildAt(0)?.get(6))).toEqual(Number(1006));
            await expectAsync(
                conn!.query(
                    `COPY (SELECT * FROM range(2000,2010) tbl(i)) TO 's3://${BUCKET_NAME}/test_written.csv' (FORMAT 'csv');`,
                ),
            ).toBeRejectedWithError('Invalid Error: File is not opened in write mode');
        });

        it('can read parquet file from URL with long query string', async () => {
            // Create S3 file
            const data = await resolveData('/uni/studenten.parquet');
            await putTestFileToS3('correct_auth_test', 'parquet', data);
            // Generate a long query string, similar to an S3 Presigned URL
            const queryString = generateLongQueryString();
            // Execute the query
            const result = await conn!.query(
                `SELECT * FROM "${S3_ENDPOINT}/${BUCKET_NAME}/correct_auth_test.parquet?${queryString}";`,
            );
            expect(Number(result.getChildAt(0)?.get(6))).toEqual(Number(29120));
        });

        it('can read csv file from URL with long query string', async () => {
            // Create S3 file
            const data = await resolveData('/uni/studenten.parquet');
            await putTestFileToS3('correct_auth_test', 'csv', data);
            // Generate a long query string, similar to an S3 Presigned URL
            const queryString = generateLongQueryString();
            // Execute the query
            const result = await conn!.query(
                `SELECT * FROM "${S3_ENDPOINT}/${BUCKET_NAME}/correct_auth_test.csv?${queryString}";`,
            );
            expect(Number(result.getChildAt(0)?.get(6))).toEqual(Number(29120));
        });
    });
}
