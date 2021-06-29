import { CSVTableOptions, JSONTableOptions } from 'src/bindings/table_options';
import { LogEntryVariant } from '../log';
import { ScriptTokens } from 'src/bindings/tokens';
import { FileStatistics } from 'src/bindings/file_stats';

export type ConnectionID = number;

export enum WorkerRequestType {
    GET_VERSION = 'GET_VERSION',
    GET_FEATURE_FLAGS = 'GET_FEATURE_FLAGS',
    RESET = 'RESET',
    PING = 'PING',
    TOKENIZE = 'TOKENIZE',
    DROP_FILE = 'DROP_FILE',
    DROP_FILES = 'DROP_FILES',
    FLUSH_FILES = 'FLUSH_FILES',
    REGISTER_FILE_URL = 'REGISTER_FILE_URL',
    REGISTER_FILE_BUFFER = 'REGISTER_FILE_BUFFER',
    REGISTER_FILE_HANDLE = 'REGISTER_FILE_HANDLE',
    COPY_FILE_TO_PATH = 'COPY_FILE_TO_PATH',
    COPY_FILE_TO_BUFFER = 'COPY_FILE_TO_BUFFER',
    ENABLE_FILE_STATISTICS = 'ENABLE_FILE_STATISTICS',
    EXPORT_FILE_STATISTICS = 'EXPORT_FILE_STATISTICS',
    OPEN = 'OPEN',
    CONNECT = 'CONNECT',
    DISCONNECT = 'DISCONNECT',
    RUN_QUERY = 'RUN_QUERY',
    SEND_QUERY = 'SEND_QUERY',
    FETCH_QUERY_RESULTS = 'FETCH_QUERY_RESULTS',
    ZIP_EXTRACT_FILE = 'ZIP_EXTRACT_FILE',
    IMPORT_CSV_FROM_PATH = 'IMPORT_CSV_FROM_PATH',
    IMPORT_JSON_FROM_PATH = 'IMPORT_JSON_FROM_PATH',
}

export enum WorkerResponseType {
    VERSION_STRING = 'VERSION_STRING',
    FEATURE_FLAGS = 'FEATURE_FLAGS',
    SCRIPT_TOKENS = 'SCRIPT_TOKENS',
    LOG = 'LOG',
    OK = 'OK',
    ERROR = 'ERROR',
    SUCCESS = 'SUCCESS',
    CONNECTION_INFO = 'CONNECTION_INFO',
    FILE_BUFFER = 'FILE_BUFFER',
    FILE_STATISTICS = 'FILE_STATISTICS',
    QUERY_PLAN = 'QUERY_PLAN',
    QUERY_RESULT = 'QUERY_RESULT',
    QUERY_RESULT_CHUNK = 'QUERY_RESULT_CHUNK',
    QUERY_START = 'QUERY_START',
    REGISTERED_FILE = 'REGISTERED_FILE',
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
    | WorkerRequest<WorkerRequestType.REGISTER_FILE_URL, [string, string]>
    | WorkerRequest<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array]>
    | WorkerRequest<WorkerRequestType.REGISTER_FILE_HANDLE, [string, any]>
    | WorkerRequest<WorkerRequestType.CONNECT, null>
    | WorkerRequest<WorkerRequestType.DISCONNECT, number>
    | WorkerRequest<WorkerRequestType.FETCH_QUERY_RESULTS, number>
    | WorkerRequest<WorkerRequestType.DROP_FILE, string>
    | WorkerRequest<WorkerRequestType.DROP_FILES, null>
    | WorkerRequest<WorkerRequestType.FLUSH_FILES, null>
    | WorkerRequest<WorkerRequestType.GET_FEATURE_FLAGS, null>
    | WorkerRequest<WorkerRequestType.COPY_FILE_TO_BUFFER, string>
    | WorkerRequest<WorkerRequestType.COPY_FILE_TO_PATH, [string, string]>
    | WorkerRequest<WorkerRequestType.ENABLE_FILE_STATISTICS, [string, boolean]>
    | WorkerRequest<WorkerRequestType.EXPORT_FILE_STATISTICS, string>
    | WorkerRequest<WorkerRequestType.GET_VERSION, null>
    | WorkerRequest<WorkerRequestType.IMPORT_CSV_FROM_PATH, [number, string, CSVTableOptions]>
    | WorkerRequest<WorkerRequestType.IMPORT_JSON_FROM_PATH, [number, string, JSONTableOptions]>
    | WorkerRequest<WorkerRequestType.OPEN, [string, string | null]>
    | WorkerRequest<WorkerRequestType.PING, null>
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
    | WorkerTask<WorkerRequestType.REGISTER_FILE_URL, [string, string], null>
    | WorkerTask<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array], null>
    | WorkerTask<WorkerRequestType.REGISTER_FILE_HANDLE, [string, any], null>
    | WorkerTask<WorkerRequestType.CONNECT, null, ConnectionID>
    | WorkerTask<WorkerRequestType.DISCONNECT, ConnectionID, null>
    | WorkerTask<WorkerRequestType.FETCH_QUERY_RESULTS, ConnectionID, Uint8Array>
    | WorkerTask<WorkerRequestType.DROP_FILE, string, boolean>
    | WorkerTask<WorkerRequestType.DROP_FILES, null, null>
    | WorkerTask<WorkerRequestType.FLUSH_FILES, null, null>
    | WorkerTask<WorkerRequestType.GET_FEATURE_FLAGS, null, number>
    | WorkerTask<WorkerRequestType.COPY_FILE_TO_BUFFER, string, Uint8Array>
    | WorkerTask<WorkerRequestType.COPY_FILE_TO_PATH, [string, string], null>
    | WorkerTask<WorkerRequestType.ENABLE_FILE_STATISTICS, [string, boolean], null>
    | WorkerTask<WorkerRequestType.EXPORT_FILE_STATISTICS, string, FileStatistics>
    | WorkerTask<WorkerRequestType.GET_VERSION, null, string>
    | WorkerTask<WorkerRequestType.IMPORT_CSV_FROM_PATH, [number, string, CSVTableOptions], null>
    | WorkerTask<WorkerRequestType.IMPORT_JSON_FROM_PATH, [number, string, JSONTableOptions], null>
    | WorkerTask<WorkerRequestType.OPEN, [string, string | null], null>
    | WorkerTask<WorkerRequestType.PING, null, null>
    | WorkerTask<WorkerRequestType.RESET, null, null>
    | WorkerTask<WorkerRequestType.RUN_QUERY, [ConnectionID, string], Uint8Array>
    | WorkerTask<WorkerRequestType.SEND_QUERY, [ConnectionID, string], Uint8Array>
    | WorkerTask<WorkerRequestType.TOKENIZE, string, ScriptTokens>
    | WorkerTask<WorkerRequestType.ZIP_EXTRACT_FILE, ZipExtractToFileArgs, null>;
