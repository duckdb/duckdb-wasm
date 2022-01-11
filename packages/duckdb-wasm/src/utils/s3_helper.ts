import {S3Config} from "../bindings";
import {sha256} from "js-sha256";

interface S3Params {
    url: string,
    query: string,
    host: string,
    region: string,
    service: string,
    method: string,
    access_key_id: string,
    secret_access_key: string,
    session_token: string,
    date_now: string,
    datetime_now: string
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
        access_key_id: (config?.accessKeyId) ?? "",
        secret_access_key: (config?.secretAccessKey) ?? "",
        session_token: (config?.sessionToken) ?? "",
        date_now: new Date().toISOString().replace(/-/g,'').split('T')[0],
        datetime_now: new Date().toISOString().replace(/-/g,'').replace(/:/g,'').split('.')[0]+ 'Z',
    };
};

const uri_encode = function(input : string, encode_slash = false) {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html

    const hex_digit = "0123456789ABCDEF";
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
            result += hex_digit[ch.charCodeAt(0) >> 4];
            result += hex_digit[ch.charCodeAt(0) & 15];
        }
    }
    return result;
}

export function createS3Headers(config : S3Config | undefined, url : string, method : string) : Map<string, string> {
    const params = getS3Params(config, url, method);
    return createS3HeadersInternal(params);
}

export function createS3HeadersInternal(params: S3Params) : Map<string, string> {
    // this is the sha256 of the empty string, its useful since we have no payload for GET requests
    const empty_payload_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    const res = new Map<string, string>();
    // res.set("host", params.host)
    res.set("x-amz-date", params.datetime_now);
    res.set("x-amz-content-sha256", empty_payload_hash);

    if (params.session_token) {
        res.set("x-amz-security-token", params.session_token);
    }

    // construct string to sign
    // hash_bytes canonical_request_hash;
    // hash_str canonical_request_hash_str;
    let signed_headers = "host;x-amz-content-sha256;x-amz-date";
    if (params.session_token) {
        signed_headers += ";x-amz-security-token";
    }

    let canonical_request = params.method + "\n" + uri_encode(params.url) + "\n" + params.query + "\nhost:" + params.host +
        "\nx-amz-content-sha256:" + empty_payload_hash + "\nx-amz-date:" + params.datetime_now;
    if (params.session_token && params.session_token.length > 0) {
        canonical_request += "\nx-amz-security-token:" + params.session_token;
    }

    canonical_request += "\n\n" + signed_headers + "\n" + empty_payload_hash;
    const canonical_request_hash_str = sha256(canonical_request);

    const string_to_sign = "AWS4-HMAC-SHA256\n" + params.datetime_now + "\n" + params.date_now + "/" + params.region + "/" + params.service +
        "/aws4_request\n" + canonical_request_hash_str;

    // ts-ignore's because library can accept array buffer as key, but TS arg is incorrect
    const sign_key = "AWS4" + params.secret_access_key;
    const k_date = sha256.hmac.arrayBuffer(sign_key, params.date_now);
    // @ts-ignore
    const k_region = sha256.hmac.arrayBuffer(k_date, params.region);
    // @ts-ignore
    const k_service = sha256.hmac.arrayBuffer(k_region, params.service,);
    // @ts-ignore
    const signing_key = sha256.hmac.arrayBuffer(k_service, "aws4_request");
    // @ts-ignore
    const signature = sha256.hmac(signing_key, string_to_sign);

    res.set("Authorization", "AWS4-HMAC-SHA256 Credential=" + params.access_key_id + "/" + params.date_now + "/" + params.region + "/" +
        params.service + "/aws4_request, SignedHeaders=" + signed_headers +
        ", Signature=" + signature);

    return res;
}

export function addS3Headers(xhr: XMLHttpRequest, config : S3Config | undefined, url : string, method: string) {
    if (config?.accessKeyId || config?.sessionToken) {
        const headers = createS3Headers(config, url, method);
        headers.forEach((value: string, header: string) => {
            xhr.setRequestHeader(header, value);
        });
    }
}

export function parseS3Url (url: string) : {bucket : string, path : string} {
    // some URI parsing woo
    if (url.indexOf("s3://") != 0) {
        throw new Error("URL needs to start with s3://");
    }
    const slash_pos = url.indexOf('/', 5);

    if (slash_pos == -1) {
        throw new Error("URL needs to contain a '/' after the host");
    }

    const bucket = url.substring(5, slash_pos);
    if (!bucket) {
        throw new Error("URL needs to contain a bucket name");
    }
    const path = url.substring(slash_pos);
    if (!path) {
        throw new Error("URL needs to contain key");
    }

    return {bucket: bucket, path: path}
}

export function getHTTPUrl(config : S3Config | undefined, url : string) : string {
    const parsedUrl = parseS3Url(url);
    const host = parsedUrl.bucket + "." + (config?.endpoint ? config?.endpoint : "s3.amazonaws.com");
    const http_host = "https://" + host;
    return http_host + parsedUrl.path;
}

// this computes the signature from https://czak.pl/2015/09/15/s3-rest-api-with-curl.html
export function verifyS3Helper() {
    const testParams1 : S3Params = {
        url: "/",
        query: "",
        host: "my-precious-bucket.s3.amazonaws.com",
        region: "us-east-1",
        service: "s3",
        method: "GET",
        access_key_id: "AKIAIOSFODNN7EXAMPLE",
        secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        session_token: "",
        date_now: "20150915",
        datetime_now: "20150915T124500Z",
    };

    const test_header = createS3HeadersInternal(testParams1);
    if (test_header.get("Authorization") != "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20150915/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=182072eb53d85c36b2d791a1fa46a12d23454ec1e921b02075c23aee40166d5a") {
        throw new Error("Auth header incorrect");
    }

    const canonical_query_string = "delimiter=%2F&encoding-type=url&list-type=2&prefix="; // aws s3 ls <bucket>

    const testParams2 : S3Params = {
        url: "/",
        query: canonical_query_string,
        host: "my-precious-bucket.s3.eu-west-1.amazonaws.com",
        region: "eu-west-1",
        service: "s3",
        method: "GET",
        access_key_id: "ASIAYSPIOYDTHTBIITVC",
        secret_access_key: "vs1BZPxSL2qVARBSg5vCMKJsavCoEPlo/HSHRaVe",
        session_token: "IQoJb3JpZ2luX2VjENX//////////wEaCWV1LXdlc3QtMSJHMEUCIQDfjzs9BYHrEXDMU/NR+PHV1uSTr7CSVSQdjKSfiPRLdgIgCCztF0VMbi9+uHHAfBVKhV4t9MlUrQg3VAOIsLxrWyoqlAIIHRAAGgw1ODk0MzQ4OTY2MTQiDOGl2DsYxENcKCbh+irxARe91faI+hwUhT60sMGRFg0GWefKnPclH4uRFzczrDOcJlAAaQRJ7KOsT8BrJlrY1jSgjkO7PkVjPp92vi6lJX77bg99MkUTJActiOKmd84XvAE5bFc/jFbqechtBjXzopAPkKsGuaqAhCenXnFt6cwq+LZikv/NJGVw7TRphLV+Aq9PSL9XwdzIgsW2qXwe1c3rxDNj53yStRZHVggdxJ0OgHx5v040c98gFphzSULHyg0OY6wmCMTYcswpb4kO2IIi6AiD9cY25TlwPKRKPi5CdBsTPnyTeW62u7PvwK0fTSy4ZuJUuGKQnH2cKmCXquEwoOHEiQY6nQH9fzY/EDGHMRxWWhxu0HiqIfsuFqC7GS0p0ToKQE+pzNsvVwMjZc+KILIDDQpdCWRIwu53I5PZy2Cvk+3y4XLvdZKQCsAKqeOc4c94UAS4NmUT7mCDOuRV0cLBVM8F0JYBGrUxyI+YoIvHhQWmnRLuKgTb5PkF7ZWrXBHFWG5/tZDOvBbbaCWTlRCL9b0Vpg5+BM/81xd8jChP4w83",
        date_now: "20210904",
        datetime_now: "20210904T121746Z",
    };
    const test_header2 = createS3HeadersInternal(testParams2);

    if (test_header2.get("Authorization") !=
        "AWS4-HMAC-SHA256 Credential=ASIAYSPIOYDTHTBIITVC/20210904/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4d9d6b59d7836b6485f6ad822de97be40287da30347d83042ea7fbed530dc4c0") {
        console.log(test_header2.get("Authorization"));
        console.log("AWS4-HMAC-SHA256 Credential=ASIAYSPIOYDTHTBIITVC/20210904/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4d9d6b59d7836b6485f6ad822de97be40287da30347d83042ea7fbed530dc4c0");
        throw new Error("test_header2 incorrect");
    }

    if (uri_encode("/category=Books/") != "/category%3DBooks/") {
        console.log(uri_encode("/category=Books/"));
        throw new Error("test fail1");
    }
    if (uri_encode("/?category=Books&title=Ducks Retreat/") != "/%3Fcategory%3DBooks%26title%3DDucks%20Retreat/") {
        throw new Error("test fail2");
    }

    if (uri_encode("/?category=Books&title=Ducks Retreat/", true) !=
        "%2F%3Fcategory%3DBooks%26title%3DDucks%20Retreat%2F") {
        throw new Error("test fail3");
    }
}