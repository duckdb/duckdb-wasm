import { DuckDBConfig, DuckDBConnection, DuckDBDataProtocol, FileStatistics, InstantiationProgress } from '.';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from './insert_options';
import { ScriptTokens } from './tokens';
import { WebFile } from './web_file';
import * as arrow from 'apache-arrow';

export interface DuckDBBindings {
    open(config: DuckDBConfig): void;
    reset(): void;
    instantiate(onProgress: (p: InstantiationProgress) => void): Promise<this>;

    getVersion(): string;
    getFeatureFlags(): number;
    tokenize(text: string): ScriptTokens;

    connect(): DuckDBConnection;
    disconnect(conn: number): void;
    runQuery(conn: number, text: string): Uint8Array;
    startPendingQuery(conn: number, text: string): Uint8Array | null;
    pollPendingQuery(conn: number): Uint8Array | null;
    cancelPendingQuery(conn: number): boolean;
    fetchQueryResults(conn: number): Uint8Array;
    getTableNames(conn: number, text: string): string[];

    createPrepared(conn: number, text: string): number;
    closePrepared(conn: number, statement: number): void;
    runPrepared(conn: number, statement: number, params: any[]): Uint8Array;
    sendPrepared(conn: number, statement: number, params: any[]): Uint8Array;

    createScalarFunction(conn: number, name: string, returns: arrow.DataType, func: (...args: any[]) => void): void;

    insertArrowFromIPCStream(conn: number, buffer: Uint8Array, options?: ArrowInsertOptions): void;
    insertCSVFromPath(conn: number, path: string, options: CSVInsertOptions): void;
    insertJSONFromPath(conn: number, path: string, options: JSONInsertOptions): void;

    registerFileURL(name: string, url: string, proto: DuckDBDataProtocol, directIO: boolean): void;
    registerFileText(name: string, text: string): void;
    registerFileBuffer(name: string, buffer: Uint8Array): void;
    registerFileHandle<HandleType>(
        name: string,
        handle: HandleType,
        protocol: DuckDBDataProtocol,
        directIO: boolean,
    ): Promise<void>;
    prepareDBFileHandle(path: string, protocol: DuckDBDataProtocol): Promise<void>;
    globFiles(path: string): WebFile[];
    dropFile(name: string): void;
    dropFiles(): void;
    flushFiles(): void;
    copyFileToPath(name: string, path: string): void;
    copyFileToBuffer(name: string): Uint8Array;
    collectFileStatistics(file: string, enable: boolean): void;
    exportFileStatistics(file: string): FileStatistics;
}
