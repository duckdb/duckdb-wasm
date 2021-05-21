import { CSVTableOptions, JSONTableOptions } from 'src/bindings/table_options';
import { LogEntryVariant } from '../log';

export type ConnectionID = number;

export enum WorkerRequestType {
    GET_VERSION = 'GET_VERSION',
    RESET = 'RESET',
    PING = 'PING',
    FLUSH_FILES = 'FLUSH_FILES',
    ADD_FILE_PATH = 'ADD_FILE_PATH',
    ADD_FILE_BLOB = 'ADD_FILE_BLOB',
    ADD_FILE_BUFFER = 'ADD_FILE_BUFFER',
    GET_FILE_OBJECT_URL = 'GET_FILE_OBJECT_URL',
    GET_FILE_BUFFER = 'GET_FILE_BUFFER',
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
    LOG = 'LOG',
    OK = 'OK',
    ERROR = 'ERROR',
    SUCCESS = 'SUCCESS',
    CONNECTION_INFO = 'CONNECTION_INFO',
    FILE_BUFFER = 'FILE_BUFFER',
    FILE_OBJECT_URL = 'FILE_OBJECT_URL',
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
    archiveFile: number;
    outFile: number;
    entryPath: string;
}

export type WorkerRequestVariant =
    | WorkerRequest<WorkerRequestType.GET_VERSION, null>
    | WorkerRequest<WorkerRequestType.RESET, null>
    | WorkerRequest<WorkerRequestType.PING, null>
    | WorkerRequest<WorkerRequestType.FLUSH_FILES, null>
    | WorkerRequest<WorkerRequestType.ADD_FILE_PATH, [string, string]>
    | WorkerRequest<WorkerRequestType.ADD_FILE_BLOB, [string, any]>
    | WorkerRequest<WorkerRequestType.ADD_FILE_BUFFER, [string, Uint8Array]>
    | WorkerRequest<WorkerRequestType.GET_FILE_OBJECT_URL, number>
    | WorkerRequest<WorkerRequestType.GET_FILE_BUFFER, number>
    | WorkerRequest<WorkerRequestType.OPEN, string>
    | WorkerRequest<WorkerRequestType.CONNECT, null>
    | WorkerRequest<WorkerRequestType.DISCONNECT, number>
    | WorkerRequest<WorkerRequestType.RUN_QUERY, [number, string]>
    | WorkerRequest<WorkerRequestType.SEND_QUERY, [number, string]>
    | WorkerRequest<WorkerRequestType.FETCH_QUERY_RESULTS, number>
    | WorkerRequest<WorkerRequestType.ZIP_EXTRACT_FILE, ZipExtractToFileArgs>
    | WorkerRequest<WorkerRequestType.IMPORT_CSV_FROM_PATH, [number, string, CSVTableOptions]>
    | WorkerRequest<WorkerRequestType.IMPORT_JSON_FROM_PATH, [number, string, JSONTableOptions]>;

export type WorkerResponseVariant =
    | WorkerResponse<WorkerResponseType.VERSION_STRING, string>
    | WorkerResponse<WorkerResponseType.LOG, LogEntryVariant>
    | WorkerResponse<WorkerResponseType.OK, null>
    | WorkerResponse<WorkerResponseType.ERROR, any>
    | WorkerResponse<WorkerResponseType.SUCCESS, boolean>
    | WorkerResponse<WorkerResponseType.REGISTERED_FILE, number>
    | WorkerResponse<WorkerResponseType.FILE_BUFFER, Uint8Array | null>
    | WorkerResponse<WorkerResponseType.FILE_OBJECT_URL, string | null>
    | WorkerResponse<WorkerResponseType.CONNECTION_INFO, number>
    | WorkerResponse<WorkerResponseType.QUERY_RESULT, Uint8Array>
    | WorkerResponse<WorkerResponseType.QUERY_RESULT_CHUNK, Uint8Array>
    | WorkerResponse<WorkerResponseType.QUERY_START, Uint8Array>
    | WorkerResponse<WorkerResponseType.QUERY_PLAN, Uint8Array>;

export type WorkerTaskVariant =
    | WorkerTask<WorkerRequestType.GET_VERSION, null, string>
    | WorkerTask<WorkerRequestType.RESET, null, null>
    | WorkerTask<WorkerRequestType.PING, null, null>
    | WorkerTask<WorkerRequestType.FLUSH_FILES, null, null>
    | WorkerTask<WorkerRequestType.ADD_FILE_PATH, [string, string], number>
    | WorkerTask<WorkerRequestType.ADD_FILE_BLOB, [string, any], number>
    | WorkerTask<WorkerRequestType.ADD_FILE_BUFFER, [string, Uint8Array], number>
    | WorkerTask<WorkerRequestType.GET_FILE_OBJECT_URL, number, string | null>
    | WorkerTask<WorkerRequestType.GET_FILE_BUFFER, number, Uint8Array | null>
    | WorkerTask<WorkerRequestType.OPEN, string | null, null>
    | WorkerTask<WorkerRequestType.CONNECT, null, ConnectionID>
    | WorkerTask<WorkerRequestType.DISCONNECT, ConnectionID, null>
    | WorkerTask<WorkerRequestType.SEND_QUERY, [ConnectionID, string], Uint8Array>
    | WorkerTask<WorkerRequestType.RUN_QUERY, [ConnectionID, string], Uint8Array>
    | WorkerTask<WorkerRequestType.FETCH_QUERY_RESULTS, ConnectionID, Uint8Array>
    | WorkerTask<WorkerRequestType.ZIP_EXTRACT_FILE, ZipExtractToFileArgs, null>
    | WorkerTask<WorkerRequestType.IMPORT_CSV_FROM_PATH, [number, string, CSVTableOptions], null>
    | WorkerTask<WorkerRequestType.IMPORT_JSON_FROM_PATH, [number, string, JSONTableOptions], null>;
