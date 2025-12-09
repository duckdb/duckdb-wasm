import { getS3Params, parseS3Url, getHTTPUrl } from '../src/utils/s3_helper';
import { S3Config } from '../src/bindings';

describe('S3 Helper', () => {
    describe('parseS3Url', () => {
        it('parses basic s3:// URL', () => {
            const result = parseS3Url('s3://my-bucket/path/to/object.txt');
            expect(result).toEqual({
                bucket: 'my-bucket',
                path: '/path/to/object.txt',
            });
        });

        it('throws on non-s3:// URL', () => {
            expect(() => parseS3Url('https://example.com/file.txt')).toThrow("URL needs to start with s3://");
        });

        it('throws on URL without path', () => {
            expect(() => parseS3Url('s3://my-bucket')).toThrow("URL needs to contain a '/' after the host");
        });
    });

    describe('getS3Params - path-style access with endpoint path prefix', () => {
        it('includes endpoint path prefix in signed URL for path-style access', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com/some/path/prefix',
                region: 'us-east-1',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            };

            const params = getS3Params(config, 's3://my-bucket/object.txt', 'GET');

            // Path should include: endpoint prefix + bucket + object path
            expect(params.url).toBe('/some/path/prefix/my-bucket/object.txt');
            // Host should NOT include the path prefix
            expect(params.host).toBe('s3.example.com');
        });

        it('handles endpoint without path prefix', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com',
                region: 'us-east-1',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            };

            const params = getS3Params(config, 's3://my-bucket/object.txt', 'GET');

            // Path should include: bucket + object path (no prefix)
            expect(params.url).toBe('/my-bucket/object.txt');
            expect(params.host).toBe('s3.example.com');
        });

        it('handles endpoint with trailing slash', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com/prefix/',
                region: 'us-east-1',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            };

            const params = getS3Params(config, 's3://my-bucket/object.txt', 'GET');

            expect(params.url).toBe('/prefix//my-bucket/object.txt');
            expect(params.host).toBe('s3.example.com');
        });

        it('includes port in host when present', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com:9000/prefix',
                region: 'us-east-1',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            };

            const params = getS3Params(config, 's3://my-bucket/object.txt', 'GET');

            expect(params.url).toBe('/prefix/my-bucket/object.txt');
            // Host should include port
            expect(params.host).toBe('s3.example.com:9000');
        });

        it('handles deep path prefixes', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com/api/v1/storage/s3',
                region: 'us-east-1',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            };

            const params = getS3Params(config, 's3://my-bucket/folder/file.txt', 'GET');

            expect(params.url).toBe('/api/v1/storage/s3/my-bucket/folder/file.txt');
            expect(params.host).toBe('s3.example.com');
        });
    });

    describe('getS3Params - virtual-hosted style (non-http endpoint)', () => {
        it('uses virtual-hosted style for non-http endpoints', () => {
            const config: S3Config = {
                endpoint: 's3.custom-region.amazonaws.com',
                region: 'custom-region',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            };

            const params = getS3Params(config, 's3://my-bucket/object.txt', 'GET');

            // Virtual-hosted style: bucket NOT in path
            expect(params.url).toBe('/object.txt');
            // Bucket prepended to hostname
            expect(params.host).toBe('my-bucket.s3.custom-region.amazonaws.com');
        });

        it('uses default AWS S3 URL when no endpoint provided', () => {
            const config: S3Config = {
                region: 'us-east-1',
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            };

            const params = getS3Params(config, 's3://my-bucket/object.txt', 'GET');

            expect(params.url).toBe('/object.txt');
            expect(params.host).toBe('my-bucket.s3.amazonaws.com');
        });
    });

    describe('getHTTPUrl', () => {
        it('constructs full HTTP URL for path-style access with prefix', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com/prefix',
                region: 'us-east-1',
            };

            const httpUrl = getHTTPUrl(config, 's3://my-bucket/object.txt');

            expect(httpUrl).toBe('https://s3.example.com/prefix/my-bucket/object.txt');
        });

        it('constructs full HTTP URL for virtual-hosted style', () => {
            const config: S3Config = {
                endpoint: 's3.amazonaws.com',
                region: 'us-east-1',
            };

            const httpUrl = getHTTPUrl(config, 's3://my-bucket/object.txt');

            expect(httpUrl).toBe('https://my-bucket.s3.amazonaws.com/object.txt');
        });

        it('constructs full HTTP URL with default endpoint', () => {
            const config: S3Config = {
                region: 'us-east-1',
            };

            const httpUrl = getHTTPUrl(config, 's3://my-bucket/object.txt');

            expect(httpUrl).toBe('https://my-bucket.s3.amazonaws.com/object.txt');
        });
    });

    describe('getS3Params - general properties', () => {
        it('sets method correctly', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com',
                region: 'us-east-1',
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
            };

            const getParams = getS3Params(config, 's3://bucket/object', 'GET');
            const putParams = getS3Params(config, 's3://bucket/object', 'PUT');

            expect(getParams.method).toBe('GET');
            expect(putParams.method).toBe('PUT');
        });

        it('includes session token when provided', () => {
            const config: S3Config = {
                endpoint: 'https://s3.example.com',
                region: 'us-east-1',
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
                sessionToken: 'test-session-token',
            };

            const params = getS3Params(config, 's3://bucket/object', 'GET');

            expect(params.sessionToken).toBe('test-session-token');
        });

        it('generates date/datetime fields', () => {
            const config: S3Config = {
                region: 'us-east-1',
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
            };

            const params = getS3Params(config, 's3://bucket/object', 'GET');

            // Date format: YYYYMMDD
            expect(params.dateNow).toMatch(/^\d{8}$/);
            // Datetime format: YYYYMMDDTHHmmssZ
            expect(params.datetimeNow).toMatch(/^\d{8}T\d{6}Z$/);
        });
    });
});
