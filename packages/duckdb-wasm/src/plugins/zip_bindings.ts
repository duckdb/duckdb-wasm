import { DuckDBBindings } from '../bindings';
import { StatusCode } from '../status';

export interface ZipArchiveEntryInfo {
    fileName: string;
    versionMadeBy: number;
    versionNeeded: number;
    headerOffset: number;
    crc32: number;
    bitFlag: number;
    method: number;
    sizeCompressed: number;
    sizeUncompressed: number;
    attributesInternal: number;
    attributesExternal: number;
    isDirectory: boolean;
    isEncrypted: boolean;
    isSupported: boolean;
    comment: string;
}

export class ZipArchiveEntry {
    _bindings: ZipBindings;
    _archiveID: number;
    _info: ZipArchiveEntryInfo;

    constructor(bindings: ZipBindings, archiveID: number, info: ZipArchiveEntryInfo) {
        this._bindings = bindings;
        this._archiveID = archiveID;
        this._info = info;
    }
}

export class ZipBindings {
    /// The DuckDB bindings
    _duckdb: DuckDBBindings;

    constructor(duckdb: DuckDBBindings) {
        this._duckdb = duckdb;
    }

    public loadFile(path: string): void {
        const [s, d, n] = this._duckdb.callSRet('duckdb_web_zip_load_file', ['string'], [path]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this._duckdb.readString(d, n));
        }
        this._duckdb.dropResponseBuffers();
    }

    public readEntryCount(): number {
        const [s, d, n] = this._duckdb.callSRet('duckdb_web_zip_read_entry_count', [], []);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this._duckdb.readString(d, n));
        }
        this._duckdb.dropResponseBuffers();
        return d;
    }

    public readEntryInfo(entryID: number): ZipArchiveEntryInfo {
        const [s, d, n] = this._duckdb.callSRet('duckdb_web_zip_read_entry_info', ['number'], [entryID]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this._duckdb.readString(d, n));
        }
        const res = this._duckdb.readString(d, n);
        this._duckdb.dropResponseBuffers();
        return JSON.parse(res) as ZipArchiveEntryInfo;
    }

    public extractEntryToPath(entryID: number, path: string): number {
        const [s, d, n] = this._duckdb.callSRet(
            'duckdb_web_zip_extract_entry_to_path',
            ['number', 'string'],
            [entryID, path],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this._duckdb.readString(d, n));
        }
        this._duckdb.dropResponseBuffers();
        return d;
    }

    public extractPathToPath(inPath: string, outPath: string): number {
        const [s, d, n] = this._duckdb.callSRet(
            'duckdb_web_zip_extract_path_to_path',
            ['string', 'string'],
            [inPath, outPath],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this._duckdb.readString(d, n));
        }
        this._duckdb.dropResponseBuffers();
        return d;
    }
}
