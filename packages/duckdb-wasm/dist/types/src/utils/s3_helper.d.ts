import { S3Config } from "../bindings";
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
export declare function getS3Params(config: S3Config | undefined, url: string, method: string): S3Params;
export declare function uriEncode(input: string, encode_slash?: boolean): string;
export declare function createS3Headers(params: S3Params, payloadParams?: S3PayloadParams | null): Map<string, string>;
export declare function addS3Headers(xhr: XMLHttpRequest, config: S3Config | undefined, url: string, method: string, contentType?: string | null, payload?: Uint8Array | null): void;
export declare function parseS3Url(url: string): {
    bucket: string;
    path: string;
};
export declare function getHTTPUrl(config: S3Config | undefined, url: string): string;
