import { DuckDBConfig, DuckDBConnection, FileStatistics } from '.';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from './insert_options';
import { ScriptTokens } from './tokens';
import { WebFile } from './web_file';

export interface DuckDBBindings {
    open(config: DuckDBConfig): void;
    reset(): void;
    instantiate(): Promise<this>;

    getVersion(): string;
    getFeatureFlags(): number;
    tokenize(text: string): ScriptTokens;

    connect(): DuckDBConnection;
    disconnect(conn: number): void;
    runQuery(conn: number, text: string): Uint8Array;
    sendQuery(conn: number, text: string): Uint8Array;
    fetchQueryResults(conn: number): Uint8Array;

    createPrepared(conn: number, text: string): number;
    closePrepared(conn: number, statement: number): void;
    runPrepared(conn: number, statement: number, params: any[]): Uint8Array;
    sendPrepared(conn: number, statement: number, params: any[]): Uint8Array;

    insertArrowFromIPCStream(conn: number, buffer: Uint8Array, options?: ArrowInsertOptions): void;
    insertCSVFromPath(conn: number, path: string, options: CSVInsertOptions): void;
    insertJSONFromPath(conn: number, path: string, options: JSONInsertOptions): void;

    registerFileURL(name: string, url?: string): void;
    registerFileText(name: string, text: string): void;
    registerFileBuffer(name: string, buffer: Uint8Array): void;
    registerFileHandle<HandleType>(name: string, handle: HandleType): void;
    globFiles(path: string): WebFile[];
    dropFile(name: string): boolean;
    dropFiles(): void;
    flushFiles(): void;
    copyFileToPath(name: string, path: string): void;
    copyFileToBuffer(name: string): Uint8Array;
    collectFileStatistics(file: string, enable: boolean): void;
    exportFileStatistics(file: string): FileStatistics;
}
