import { Logger } from '../log';
import { CSVInsertOptions, JSONInsertOptions } from '../bindings/insert_options';
import { DuckDBDataProtocol } from '../bindings';
/** An interface for the async DuckDB bindings */
export interface AsyncDuckDBBindings {
    logger: Logger;
    registerFileURL(name: string, url: string, proto: DuckDBDataProtocol, directIO: boolean): Promise<void>;
    registerFileBuffer(name: string, buffer: Uint8Array): Promise<void>;
    registerFileHandle<HandleType>(name: string, handle: HandleType, protocol: DuckDBDataProtocol, directIO: boolean): Promise<void>;
    copyFileToPath(name: string, out: string): Promise<void>;
    copyFileToBuffer(name: string): Promise<Uint8Array>;
    disconnect(conn: number): Promise<void>;
    runQuery(conn: number, text: string): Promise<Uint8Array>;
    startPendingQuery(conn: number, text: string): Promise<Uint8Array | null>;
    pollPendingQuery(conn: number): Promise<Uint8Array | null>;
    cancelPendingQuery(conn: number): Promise<boolean>;
    fetchQueryResults(conn: number): Promise<Uint8Array>;
    createPrepared(conn: number, text: string): Promise<number>;
    closePrepared(conn: number, statement: number): Promise<void>;
    runPrepared(conn: number, statement: number, params: any[]): Promise<Uint8Array>;
    sendPrepared(conn: number, statement: number, params: any[]): Promise<Uint8Array>;
    insertArrowFromIPCStream(conn: number, buffer: Uint8Array, options?: CSVInsertOptions): Promise<void>;
    insertCSVFromPath(conn: number, path: string, options: CSVInsertOptions): Promise<void>;
    insertJSONFromPath(conn: number, path: string, options: JSONInsertOptions): Promise<void>;
}
