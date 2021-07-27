import { CSVTableOptions, JSONTableOptions } from '../bindings/table_options';
import { LogEntryVariant } from '../log';
import { ScriptTokens } from '../bindings/tokens';
import { FileStatistics } from '../bindings/file_stats';

export type ConnectionID = number;

export enum WorkerRequestType {
    COLLECT_FILE_STATISTICS = 'COLLECT_FILE_STATISTICS',
    CONNECT = 'CONNECT',
    COPY_FILE_TO_BUFFER = 'COPY_FILE_TO_BUFFER',
    COPY_FILE_TO_PATH = 'COPY_FILE_TO_PATH',
    DISCONNECT = 'DISCONNECT',
    DROP_FILE = 'DROP_FILE',
    DROP_FILES = 'DROP_FILES',
    EXPORT_FILE_STATISTICS = 'EXPORT_FILE_STATISTICS',
    FETCH_QUERY_RESULTS = 'FETCH_QUERY_RESULTS',
    FLUSH_FILES = 'FLUSH_FILES',
    GET_FEATURE_FLAGS = 'GET_FEATURE_FLAGS',
    GET_VERSION = 'GET_VERSION',
    IMPORT_CSV_FROM_PATH = 'IMPORT_CSV_FROM_PATH',
    IMPORT_JSON_FROM_PATH = 'IMPORT_JSON_FROM_PATH',
    INSTANTIATE = 'INSTANTIATE',
    OPEN = 'OPEN',
    PING = 'PING',
    REGISTER_FILE_BUFFER = 'REGISTER_FILE_BUFFER',
    REGISTER_FILE_HANDLE = 'REGISTER_FILE_HANDLE',
    REGISTER_FILE_URL = 'REGISTER_FILE_URL',
    RESET = 'RESET',
    RUN_QUERY = 'RUN_QUERY',
    SEND_QUERY = 'SEND_QUERY',
    TOKENIZE = 'TOKENIZE',
    ZIP_EXTRACT_FILE = 'ZIP_EXTRACT_FILE',
}

export enum WorkerResponseType {
    CONNECTION_INFO = 'CONNECTION_INFO',
    ERROR = 'ERROR',
    FEATURE_FLAGS = 'FEATURE_FLAGS',
    FILE_BUFFER = 'FILE_BUFFER',
    FILE_SIZE = 'FILE_SIZE',
    FILE_STATISTICS = 'FILE_STATISTICS',
    LOG = 'LOG',
    OK = 'OK',
    QUERY_PLAN = 'QUERY_PLAN',
    QUERY_RESULT = 'QUERY_RESULT',
    QUERY_RESULT_CHUNK = 'QUERY_RESULT_CHUNK',
    QUERY_START = 'QUERY_START',
    REGISTERED_FILE = 'REGISTERED_FILE',
    SCRIPT_TOKENS = 'SCRIPT_TOKENS',
    SUCCESS = 'SUCCESS',
    VERSION_STRING = 'VERSION_STRING',
}

export type WorkerRequest<T, P> = {
    readonly messageId: number;
    readonly type: T;
    readonly data: P;
};

export type WorkerResponse<T, P> = {
    readonly messageId: number;
    readonly requestId: number;
    readonly type: T;
    readonly data: P;
};

export type WorkerTaskReturnType<T extends WorkerTaskVariant> = T extends WorkerTask<any, any, infer P> ? P : never;

export class WorkerTask<T, D, P> {
    readonly type: T;
    readonly data: D;
    promise: Promise<P>;
    promiseResolver: (value: P | PromiseLike<P>) => void = () => {};
    promiseRejecter: (value: any) => void = () => {};

    constructor(type: T, data: D) {
        this.type = type;
        this.data = data;
        this.promise = new Promise<P>(
            (resolve: (value: P | PromiseLike<P>) => void, reject: (reason?: void) => void) => {
                this.promiseResolver = resolve;
                this.promiseRejecter = reject;
            },
        );
    }
}

export interface ZipExtractToFileArgs {
    archiveFile: string;
    outFile: string;
    entryPath: string;
}

export type WorkerRequestVariant =
    | WorkerRequest<WorkerRequestType.COLLECT_FILE_STATISTICS, [string, boolean]>
    | WorkerRequest<WorkerRequestType.CONNECT, null>
    | WorkerRequest<WorkerRequestType.COPY_FILE_TO_BUFFER, string>
    | WorkerRequest<WorkerRequestType.COPY_FILE_TO_PATH, [string, string]>
    | WorkerRequest<WorkerRequestType.DISCONNECT, number>
    | WorkerRequest<WorkerRequestType.DROP_FILE, string>
    | WorkerRequest<WorkerRequestType.DROP_FILES, null>
    | WorkerRequest<WorkerRequestType.EXPORT_FILE_STATISTICS, string>
    | WorkerRequest<WorkerRequestType.FETCH_QUERY_RESULTS, number>
    | WorkerRequest<WorkerRequestType.FLUSH_FILES, null>
    | WorkerRequest<WorkerRequestType.GET_FEATURE_FLAGS, null>
    | WorkerRequest<WorkerRequestType.GET_VERSION, null>
    | WorkerRequest<WorkerRequestType.IMPORT_CSV_FROM_PATH, [number, string, CSVTableOptions]>
    | WorkerRequest<WorkerRequestType.IMPORT_JSON_FROM_PATH, [number, string, JSONTableOptions]>
    | WorkerRequest<WorkerRequestType.INSTANTIATE, [string, string | null]>
    | WorkerRequest<WorkerRequestType.OPEN, string>
    | WorkerRequest<WorkerRequestType.PING, null>
    | WorkerRequest<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array]>
    | WorkerRequest<WorkerRequestType.REGISTER_FILE_HANDLE, [string, any]>
    | WorkerRequest<WorkerRequestType.REGISTER_FILE_URL, [string, string]>
    | WorkerRequest<WorkerRequestType.RESET, null>
    | WorkerRequest<WorkerRequestType.RUN_QUERY, [number, string]>
    | WorkerRequest<WorkerRequestType.SEND_QUERY, [number, string]>
    | WorkerRequest<WorkerRequestType.TOKENIZE, string>
    | WorkerRequest<WorkerRequestType.ZIP_EXTRACT_FILE, ZipExtractToFileArgs>;

export type WorkerResponseVariant =
    | WorkerResponse<WorkerResponseType.CONNECTION_INFO, number>
    | WorkerResponse<WorkerResponseType.ERROR, any>
    | WorkerResponse<WorkerResponseType.FEATURE_FLAGS, number>
    | WorkerResponse<WorkerResponseType.FILE_BUFFER, Uint8Array>
    | WorkerResponse<WorkerResponseType.FILE_SIZE, number>
    | WorkerResponse<WorkerResponseType.FILE_STATISTICS, FileStatistics>
    | WorkerResponse<WorkerResponseType.LOG, LogEntryVariant>
    | WorkerResponse<WorkerResponseType.OK, null>
    | WorkerResponse<WorkerResponseType.QUERY_PLAN, Uint8Array>
    | WorkerResponse<WorkerResponseType.QUERY_RESULT, Uint8Array>
    | WorkerResponse<WorkerResponseType.QUERY_RESULT_CHUNK, Uint8Array>
    | WorkerResponse<WorkerResponseType.QUERY_START, Uint8Array>
    | WorkerResponse<WorkerResponseType.SCRIPT_TOKENS, ScriptTokens>
    | WorkerResponse<WorkerResponseType.SUCCESS, boolean>
    | WorkerResponse<WorkerResponseType.VERSION_STRING, string>;

export type WorkerTaskVariant =
    | WorkerTask<WorkerRequestType.COLLECT_FILE_STATISTICS, [string, boolean], null>
    | WorkerTask<WorkerRequestType.CONNECT, null, ConnectionID>
    | WorkerTask<WorkerRequestType.COPY_FILE_TO_BUFFER, string, Uint8Array>
    | WorkerTask<WorkerRequestType.COPY_FILE_TO_PATH, [string, string], null>
    | WorkerTask<WorkerRequestType.DISCONNECT, ConnectionID, null>
    | WorkerTask<WorkerRequestType.DROP_FILE, string, boolean>
    | WorkerTask<WorkerRequestType.DROP_FILES, null, null>
    | WorkerTask<WorkerRequestType.EXPORT_FILE_STATISTICS, string, FileStatistics>
    | WorkerTask<WorkerRequestType.FETCH_QUERY_RESULTS, ConnectionID, Uint8Array>
    | WorkerTask<WorkerRequestType.FLUSH_FILES, null, null>
    | WorkerTask<WorkerRequestType.GET_FEATURE_FLAGS, null, number>
    | WorkerTask<WorkerRequestType.GET_VERSION, null, string>
    | WorkerTask<WorkerRequestType.IMPORT_CSV_FROM_PATH, [number, string, CSVTableOptions], null>
    | WorkerTask<WorkerRequestType.IMPORT_JSON_FROM_PATH, [number, string, JSONTableOptions], null>
    | WorkerTask<WorkerRequestType.INSTANTIATE, [string, string | null], null>
    | WorkerTask<WorkerRequestType.OPEN, string, null>
    | WorkerTask<WorkerRequestType.PING, null, null>
    | WorkerTask<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array], null>
    | WorkerTask<WorkerRequestType.REGISTER_FILE_HANDLE, [string, any], null>
    | WorkerTask<WorkerRequestType.REGISTER_FILE_URL, [string, string], null>
    | WorkerTask<WorkerRequestType.RESET, null, null>
    | WorkerTask<WorkerRequestType.RUN_QUERY, [ConnectionID, string], Uint8Array>
    | WorkerTask<WorkerRequestType.SEND_QUERY, [ConnectionID, string], Uint8Array>
    | WorkerTask<WorkerRequestType.TOKENIZE, string, ScriptTokens>
    | WorkerTask<WorkerRequestType.ZIP_EXTRACT_FILE, ZipExtractToFileArgs, number>;
