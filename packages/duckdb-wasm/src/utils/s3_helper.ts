import { S3Config } from '../bindings';
import { sha256 } from 'js-sha256';

export interface S3Params {
    url: string;
    query: string;
    host: string;
    region: string;
    service: string;
    method: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    dateNow: string;
    datetimeNow: string;
}

export interface S3PayloadParams {
    contentHash: string | null;
    contentType: string | null;
}

const getEndpointPathPrefix = function (config: S3Config | undefined): string {
    if (config?.endpoint?.startsWith('http')) {
        const endpointUrl = new URL(config.endpoint);
        // Return the path prefix if present, otherwise empty string
        return endpointUrl.pathname !== '/' ? endpointUrl.pathname : '';
    }
    return '';
};

const getHTTPHost = function (config: S3Config | undefined, url: string, bucket: string): string {
    if (config?.endpoint?.startsWith('http')) {
        // Endpoint is a full url, extract just the hostname (no path)
        const endpointUrl = new URL(config.endpoint);
        return endpointUrl.host;
    } else if (config?.endpoint) {
        // Endpoint is not a full url and the https://{bucket}.{domain} format will be used
        return `${bucket}.${config?.endpoint}`;
    } else {
        // Default aws s3 url
        return `${bucket}.s3.amazonaws.com`;
    }
};

export function getS3Params(config: S3Config | undefined, url: string, method: string): S3Params {
    const parsedS3Url = parseS3Url(url);

    // when using S3 path-style access, the signed URL should also include the bucket name,
    //  as it is present in the HTTP URL path.
    // See: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-bucket-intro.html#path-style-url-ex
    let path = parsedS3Url.path;
    if (isPathStyleAccess(config)) {
        // Extract endpoint path prefix if present (e.g., "/some/path/prefix" from "https://host/some/path/prefix")
        const endpointPathPrefix = getEndpointPathPrefix(config);
        path = `${endpointPathPrefix}/${parsedS3Url.bucket}${path}`;
    }
    return {
        url: path,
        query: '',
        host: getHTTPHost(config, url, parsedS3Url.bucket),
        region: config?.region ?? '',
        service: 's3',
        method: method,
        accessKeyId: config?.accessKeyId ?? '',
        secretAccessKey: config?.secretAccessKey ?? '',
        sessionToken: config?.sessionToken ?? '',
        dateNow: new Date().toISOString().replace(/-/g, '').split('T')[0],
        datetimeNow: new Date().toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0] + 'Z',
    };
}

export function uriEncode(input: string, encode_slash = false) {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html

    const hexDigit = '0123456789ABCDEF';
    let result = '';

    for (let i = 0; i < input.length; i++) {
        const ch: string = input[i];

        if (
            (ch >= 'A' && ch <= 'Z') ||
            (ch >= 'a' && ch <= 'z') ||
            (ch >= '0' && ch <= '9') ||
            ch == '_' ||
            ch == '-' ||
            ch == '~' ||
            ch == '.'
        ) {
            result += ch;
        } else if (ch == '/') {
            if (encode_slash) {
                result += '%2F';
            } else {
                result += ch;
            }
        } else {
            result += '%';
            result += hexDigit[ch.charCodeAt(0) >> 4];
            result += hexDigit[ch.charCodeAt(0) & 15];
        }
    }
    return result;
}

export function createS3Headers(params: S3Params, payloadParams: S3PayloadParams | null = null): Map<string, string> {
    // this is the sha256 of the empty string, its useful since we have no payload for GET requests
    const payloadHash =
        payloadParams?.contentHash ?? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const res = new Map<string, string>();
    // res.set("host", params.host)
    res.set('x-amz-date', params.datetimeNow);
    res.set('x-amz-content-sha256', payloadHash);

    if (params.sessionToken) {
        res.set('x-amz-security-token', params.sessionToken);
    }

    // construct string to sign
    let signedHeaders = '';
    if (payloadParams?.contentType) {
        signedHeaders += 'content-type;';
    }
    signedHeaders += 'host;x-amz-content-sha256;x-amz-date';
    if (params.sessionToken) {
        signedHeaders += ';x-amz-security-token';
    }

    let canonicalRequest = params.method + '\n' + uriEncode(params.url) + '\n' + params.query;
    if (payloadParams?.contentType) {
        canonicalRequest += '\ncontent-type:' + payloadParams?.contentType;
    }
    canonicalRequest +=
        '\nhost:' + params.host + '\nx-amz-content-sha256:' + payloadHash + '\nx-amz-date:' + params.datetimeNow;
    if (params.sessionToken && params.sessionToken.length > 0) {
        canonicalRequest += '\nx-amz-security-token:' + params.sessionToken;
    }

    canonicalRequest += '\n\n' + signedHeaders + '\n' + payloadHash;
    const canonicalRequestHashStr = sha256(canonicalRequest);

    const stringToSign =
        'AWS4-HMAC-SHA256\n' +
        params.datetimeNow +
        '\n' +
        params.dateNow +
        '/' +
        params.region +
        '/' +
        params.service +
        '/aws4_request\n' +
        canonicalRequestHashStr;

    const signKey = 'AWS4' + params.secretAccessKey;
    const kDate = sha256.hmac.arrayBuffer(signKey, params.dateNow);

    const kRegion = sha256.hmac.arrayBuffer(kDate, params.region);
    const kService = sha256.hmac.arrayBuffer(kRegion, params.service);
    const signingKey = sha256.hmac.arrayBuffer(kService, 'aws4_request');
    const signature = sha256.hmac(signingKey, stringToSign);

    res.set(
        'Authorization',
        'AWS4-HMAC-SHA256 Credential=' +
            params.accessKeyId +
            '/' +
            params.dateNow +
            '/' +
            params.region +
            '/' +
            params.service +
            '/aws4_request, SignedHeaders=' +
            signedHeaders +
            ', Signature=' +
            signature,
    );

    return res;
}

const createS3HeadersFromS3Config = function (
    config: S3Config | undefined,
    url: string,
    method: string,
    contentType: string | null = null,
    payload: Uint8Array | null = null,
): Map<string, string> {
    const params = getS3Params(config, url, method);
    const payloadParams = {
        contentType: contentType,
        contentHash: payload ? sha256.hex(payload!) : null,
    } as S3PayloadParams;
    return createS3Headers(params, payloadParams);
};

export function addS3Headers(
    xhr: XMLHttpRequest,
    config: S3Config | undefined,
    url: string,
    method: string,
    contentType: string | null = null,
    payload: Uint8Array | null = null,
) {
    if (config?.accessKeyId || config?.sessionToken) {
        const headers = createS3HeadersFromS3Config(config, url, method, contentType, payload);
        headers.forEach((value: string, header: string) => {
            xhr.setRequestHeader(header, value);
        });

        if (contentType) {
            xhr.setRequestHeader('content-type', contentType);
        }
    }
}

export function parseS3Url(url: string): { bucket: string; path: string } {
    if (url.indexOf('s3://') != 0) {
        throw new Error('URL needs to start with s3://');
    }
    const slashPos = url.indexOf('/', 5);

    if (slashPos == -1) {
        throw new Error("URL needs to contain a '/' after the host");
    }

    const bucket = url.substring(5, slashPos);
    if (!bucket) {
        throw new Error('URL needs to contain a bucket name');
    }
    const path = url.substring(slashPos);
    if (!path) {
        throw new Error('URL needs to contain key');
    }

    return { bucket: bucket, path: path };
}

function isPathStyleAccess(config: S3Config | undefined): boolean {
    if (config?.endpoint?.startsWith('http')) {
        return true;
    }
    return false;
}

export function getHTTPUrl(config: S3Config | undefined, url: string): string {
    const parsedUrl = parseS3Url(url);
    if (isPathStyleAccess(config)) {
        // Endpoint is a full url, we append the bucket
        return `${config?.endpoint}/${parsedUrl.bucket}` + parsedUrl.path;
    }
    return 'https://' + getHTTPHost(config, url, parsedUrl.bucket) + parsedUrl.path;
}
