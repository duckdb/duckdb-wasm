import {S3Config} from "../bindings";
import {sha256} from "js-sha256";

export interface S3Params {
    url: string,
    query: string,
    host: string,
    region: string,
    service: string,
    method: string,
    accessKeyId: string,
    secretAccessKey: string,
    sessionToken: string,
    dateNow: string,
    datetimeNow: string
}

const getS3Params = function(config : S3Config | undefined, url: string, method : string) : S3Params {
    const parsedS3Url = parseS3Url(url);
    return {
        url: parsedS3Url.path,
        query: "",
        host: `${parsedS3Url.bucket}.s3.amazonaws.com`,
        region: (config?.region) ?? "",
        service: "s3",
        method: method,
        accessKeyId: (config?.accessKeyId) ?? "",
        secretAccessKey: (config?.secretAccessKey) ?? "",
        sessionToken: (config?.sessionToken) ?? "",
        dateNow: new Date().toISOString().replace(/-/g,'').split('T')[0],
        datetimeNow: new Date().toISOString().replace(/-/g,'').replace(/:/g,'').split('.')[0]+ 'Z',
    };
};

export function uriEncode(input : string, encode_slash = false) {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html

    const hexDigit = "0123456789ABCDEF";
    let result = "";

    for (let i = 0; i < input.length; i++) {
        const ch : string = input[i];

        if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '_' ||
            ch == '-' || ch == '~' || ch == '.') {
            result += ch;
        } else if (ch == '/') {
            if (encode_slash) {
                result += "%2F";
            } else {
                result += ch;
            }
        } else {
            result += "%";
            result += hexDigit[ch.charCodeAt(0) >> 4];
            result += hexDigit[ch.charCodeAt(0) & 15];
        }
    }
    return result;
}

const createS3HeadersFromS3Config = function (config : S3Config | undefined, url : string, method : string) : Map<string, string> {
    const params = getS3Params(config, url, method);
    return createS3Headers(params);
}

export function createS3Headers(params: S3Params) : Map<string, string> {
    // this is the sha256 of the empty string, its useful since we have no payload for GET requests
    const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    const res = new Map<string, string>();
    // res.set("host", params.host)
    res.set("x-amz-date", params.datetimeNow);
    res.set("x-amz-content-sha256", payloadHash);

    if (params.sessionToken) {
        res.set("x-amz-security-token", params.sessionToken);
    }

    // construct string to sign
    let signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    if (params.sessionToken) {
        signedHeaders += ";x-amz-security-token";
    }

    let canonicalRequest = params.method + "\n" + uriEncode(params.url) + "\n" + params.query + "\nhost:" + params.host +
        "\nx-amz-content-sha256:" + payloadHash + "\nx-amz-date:" + params.datetimeNow;
    if (params.sessionToken && params.sessionToken.length > 0) {
        canonicalRequest += "\nx-amz-security-token:" + params.sessionToken;
    }

    canonicalRequest += "\n\n" + signedHeaders + "\n" + payloadHash;
    const canonicalRequestHashStr = sha256(canonicalRequest);

    const stringToSign = "AWS4-HMAC-SHA256\n" + params.datetimeNow + "\n" + params.dateNow + "/" + params.region + "/" + params.service +
        "/aws4_request\n" + canonicalRequestHashStr;

    // ts-ignore's because library can accept array buffer as key, but TS arg is incorrect
    const signKey = "AWS4" + params.secretAccessKey;
    const kDate = sha256.hmac.arrayBuffer(signKey, params.dateNow);

    // Note, js-sha256 has a bug in the TS interface that only supports strings as keys, while we need a bytearray
    // as key. PR is open but unmerged: https://github.com/emn178/js-sha256/pull/25
    // eslint-disable-next-line
    // @ts-ignore
    const kRegion = sha256.hmac.arrayBuffer(kDate, params.region);
    // eslint-disable-next-line
    // @ts-ignore
    const kService = sha256.hmac.arrayBuffer(kRegion, params.service,);
    // eslint-disable-next-line
    // @ts-ignore
    const signingKey = sha256.hmac.arrayBuffer(kService, "aws4_request");
    // eslint-disable-next-line
    // @ts-ignore
    const signature = sha256.hmac(signingKey, stringToSign);

    res.set("Authorization", "AWS4-HMAC-SHA256 Credential=" + params.accessKeyId + "/" + params.dateNow + "/" + params.region + "/" +
        params.service + "/aws4_request, SignedHeaders=" + signedHeaders +
        ", Signature=" + signature);

    return res;
}

export function addS3Headers(xhr: XMLHttpRequest, config : S3Config | undefined, url : string, method: string) {
    if (config?.accessKeyId || config?.sessionToken) {
        const headers = createS3HeadersFromS3Config(config, url, method);
        headers.forEach((value: string, header: string) => {
            xhr.setRequestHeader(header, value);
        });
    }
}

export function parseS3Url (url: string) : {bucket : string, path : string} {
    if (url.indexOf("s3://") != 0) {
        throw new Error("URL needs to start with s3://");
    }
    const slashPos = url.indexOf('/', 5);

    if (slashPos == -1) {
        throw new Error("URL needs to contain a '/' after the host");
    }

    const bucket = url.substring(5, slashPos);
    if (!bucket) {
        throw new Error("URL needs to contain a bucket name");
    }
    const path = url.substring(slashPos);
    if (!path) {
        throw new Error("URL needs to contain key");
    }

    return {bucket: bucket, path: path}
}

export function getHTTPUrl(config : S3Config | undefined, url : string) : string {
    const parsedUrl = parseS3Url(url);
    const host = parsedUrl.bucket + "." + (config?.endpoint ? config?.endpoint : "s3.amazonaws.com");
    const httpHost = "https://" + host;
    return httpHost + parsedUrl.path;
}