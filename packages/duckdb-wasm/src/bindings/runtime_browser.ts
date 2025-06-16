import { StatusCode } from '../status';
import { WorkerResponseType } from '../parallel/worker_request';
import { addS3Headers, getHTTPUrl } from '../utils';

import {
    callSRet,
    dropResponseBuffers,
    DuckDBDataProtocol,
    DuckDBFileInfo,
    DuckDBGlobalFileInfo,
    DuckDBRuntime,
    failWith,
    FileFlags,
    readString,
    PreparedDBFileHandle,
} from './runtime';
import { DuckDBModule } from './duckdb_module';
import * as udf from './udf_runtime';

const OPFS_PREFIX_LEN = 'opfs://'.length;
const PATH_SEP_REGEX = /\/|\\/;

export const BROWSER_RUNTIME: DuckDBRuntime & {
    _files: Map<string, any>;
    _fileInfoCache: Map<number, DuckDBFileInfo>;
    _globalFileInfo: DuckDBGlobalFileInfo | null;
    _preparedHandles: Record<string, FileSystemSyncAccessHandle>;
    _opfsRoot: FileSystemDirectoryHandle | null;

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
    getGlobalFileInfo(mod: DuckDBModule): DuckDBGlobalFileInfo | null;
    assignOPFSRoot(): Promise<void>;
} = {
    _files: new Map<string, any>(),
    _fileInfoCache: new Map<number, DuckDBFileInfo>(),
    _udfFunctions: new Map(),
    _globalFileInfo: null,
    _preparedHandles: {} as any,
    _opfsRoot: null,

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null {
        try {
            const cached = BROWSER_RUNTIME._fileInfoCache.get(fileId);
            const [s, d, n] = callSRet(
                mod,
                'duckdb_web_fs_get_file_info_by_id',
                ['number', 'number'],
                [fileId, cached?.cacheEpoch || 0],
            );
            if (s !== StatusCode.SUCCESS) {
                return null;
            } else if (n === 0) {
                // Epoch is up to date
                return cached!;
            }
            const infoStr = readString(mod, d, n);
            dropResponseBuffers(mod);
            try {
                const info = JSON.parse(infoStr);
                if (info == null) {
                    return null;
                }
                const file = { ...info, blob: null } as DuckDBFileInfo;
                BROWSER_RUNTIME._fileInfoCache.set(fileId, file);
                if (!BROWSER_RUNTIME._files.has(file.fileName) && BROWSER_RUNTIME._preparedHandles[file.fileName]) {
                    BROWSER_RUNTIME._files.set(file.fileName, BROWSER_RUNTIME._preparedHandles[file.fileName]);
                    delete BROWSER_RUNTIME._preparedHandles[file.fileName];
                }
                return file;
            } catch (error) {
                console.warn(error);
                return null;
            }
        } catch (e: any) {
            console.log(e);
            return null;
        }
    },

    getGlobalFileInfo(mod: DuckDBModule): DuckDBGlobalFileInfo | null {
        try {
            const [s, d, n] = callSRet(
                mod,
                'duckdb_web_get_global_file_info',
                ['number'],
                [BROWSER_RUNTIME._globalFileInfo?.cacheEpoch || 0],
            );
            if (s !== StatusCode.SUCCESS) {
                return null;
            } else if (n === 0) {
                // Epoch is up to date
                return BROWSER_RUNTIME._globalFileInfo!;
            }
            const infoStr = readString(mod, d, n);
            dropResponseBuffers(mod);
            const info = JSON.parse(infoStr);
            if (info == null) {
                return null;
            }
            BROWSER_RUNTIME._globalFileInfo = { ...info, blob: null } as DuckDBGlobalFileInfo;

            return BROWSER_RUNTIME._globalFileInfo;
        } catch (e: any) {
            console.log(e);
            return null;
        }
    },
    async assignOPFSRoot(): Promise<void> {
        if (!BROWSER_RUNTIME._opfsRoot) {
            BROWSER_RUNTIME._opfsRoot = await navigator.storage.getDirectory();
        }
    },
    /** Prepare a file handle that could only be acquired aschronously */
    async prepareFileHandles(filePaths: string[], protocol: DuckDBDataProtocol): Promise<PreparedDBFileHandle[]> {
        if (protocol === DuckDBDataProtocol.BROWSER_FSACCESS) {
            await BROWSER_RUNTIME.assignOPFSRoot();
            const prepare = async (path: string): Promise<PreparedDBFileHandle> => {
                if (BROWSER_RUNTIME._files.has(path)) {
                    return {
                        path,
                        handle: BROWSER_RUNTIME._files.get(path),
                        fromCached: true,
                    };
                }
                const opfsRoot = BROWSER_RUNTIME._opfsRoot!;
                let dirHandle: FileSystemDirectoryHandle = opfsRoot;
                // check if mkdir -p is needed
                const opfsPath = path.slice(OPFS_PREFIX_LEN);
                let fileName = opfsPath;
                if (PATH_SEP_REGEX.test(opfsPath)) {
                    const folders = opfsPath.split(PATH_SEP_REGEX);
                    if (folders.length === 0) {
                        throw new Error(`Invalid path ${opfsPath}`);
                    }
                    fileName = folders[folders.length - 1];
                    if (!fileName) {
                        throw new Error(`Invalid path ${opfsPath}. File Not Found.`);
                    }
                    folders.pop();
                    for (const folder of folders) {
                        dirHandle = await dirHandle.getDirectoryHandle(folder, { create: true });
                    }
                }
                const fileHandle = await dirHandle.getFileHandle(fileName, { create: false }).catch(e => {
                    if (e?.name === 'NotFoundError') {
                        console.debug(`File ${path} does not exists yet, creating...`);
                        return dirHandle.getFileHandle(fileName, { create: true });
                    }
                    throw e;
                });
                try {
                    const handle = await fileHandle.createSyncAccessHandle();
                    BROWSER_RUNTIME._preparedHandles[path] = handle;
                    return {
                        path,
                        handle,
                        fromCached: false,
                    };
                } catch (e: any) {
                    throw new Error(e.message + ':' + name);
                }
            };
            const result: PreparedDBFileHandle[] = [];
            for (const filePath of filePaths) {
                const res = await prepare(filePath);
                result.push(res);
            }
            return result;
        }
        throw new Error(`Unsupported protocol ${protocol} for paths ${filePaths} with protocol ${protocol}`);
    },
    /** Prepare a file handle that could only be acquired aschronously */
    async prepareDBFileHandle(dbPath: string, protocol: DuckDBDataProtocol): Promise<PreparedDBFileHandle[]> {
        if (protocol === DuckDBDataProtocol.BROWSER_FSACCESS && this.prepareFileHandles) {
            const filePaths = [dbPath, `${dbPath}.wal`];
            return this.prepareFileHandles(filePaths, protocol);
        }
        throw new Error(`Unsupported protocol ${protocol} for path ${dbPath} with protocol ${protocol}`);
    },

    testPlatformFeature: (_mod: DuckDBModule, feature: number): boolean => {
        switch (feature) {
            case 1:
                return typeof BigInt64Array !== 'undefined';
            default:
                console.warn(`test for unknown feature: ${feature}`);
                return false;
        }
    },

    getDefaultDataProtocol(mod: DuckDBModule): number {
        return DuckDBDataProtocol.BROWSER_FILEREADER;
    },

    openFile: (mod: DuckDBModule, fileId: number, flags: FileFlags): number => {
        try {
            BROWSER_RUNTIME._fileInfoCache.delete(fileId);
            const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.HTTP:
                case DuckDBDataProtocol.S3: {
                    if (flags & FileFlags.FILE_FLAGS_READ && flags & FileFlags.FILE_FLAGS_WRITE) {
                        throw new Error(
                            `Opening file ${file.fileName} failed: cannot open file with both read and write flags set`,
                        );
                    } else if (flags & FileFlags.FILE_FLAGS_APPEND) {
                        throw new Error(
                            `Opening file ${file.fileName} failed: appending to HTTP/S3 files is not supported`,
                        );
                    } else if (flags & FileFlags.FILE_FLAGS_WRITE) {
                        // We send a HEAD request to try to determine if we can write to data_url
                        const xhr = new XMLHttpRequest();
                        if (file.dataProtocol == DuckDBDataProtocol.S3) {
                            xhr.open('HEAD', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                            addS3Headers(xhr, file.s3Config, file.dataUrl!, 'HEAD');
                        } else {
                            xhr.open('HEAD', file.dataUrl!, false);
                        }
                        xhr.send(null);

                        // Expect 200 for existing files that we will overwrite or 404 for non-existent files can be created
                        if (xhr.status != 200 && xhr.status != 404) {
                            throw new Error(
                                `Opening file ${file.fileName} failed: Unexpected return status from server (${xhr.status})`,
                            );
                        } else if (
                            xhr.status == 404 &&
                            !(flags & FileFlags.FILE_FLAGS_FILE_CREATE || flags & FileFlags.FILE_FLAGS_FILE_CREATE_NEW)
                        ) {
                            throw new Error(
                                `Opening file ${file.fileName} failed: Cannot write to non-existent file without FILE_FLAGS_FILE_CREATE or FILE_FLAGS_FILE_CREATE_NEW flag.`,
                            );
                        }
                        // Return an empty buffer that can be used to buffer the writes to this s3/http file
                        const data = mod._malloc(1);
                        const src = new Uint8Array();
                        mod.HEAPU8.set(src, data);
                        const result = mod._malloc(2 * 8);
                        mod.HEAPF64[(result >> 3) + 0] = 1;
                        mod.HEAPF64[(result >> 3) + 1] = data;
                        return result;
                    } else if ((flags & FileFlags.FILE_FLAGS_READ) == 0) {
                        throw new Error(`Opening file ${file.fileName} failed: unsupported file flags: ${flags}`);
                    }

                    // Supports ranges?
                    let contentLength = null;
                    let error: any | null = null;
                    if (file.reliableHeadRequests || !file.allowFullHttpReads) {
                        try {
                            // Send a dummy HEAD request with range protocol
                            //          -> good IFF status is 206 and contentLenght is present
                            const xhr = new XMLHttpRequest();
                            if (file.dataProtocol == DuckDBDataProtocol.S3) {
                                xhr.open('HEAD', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                                addS3Headers(xhr, file.s3Config, file.dataUrl!, 'HEAD');
                            } else {
                                xhr.open('HEAD', file.dataUrl!, false);
                            }
                            xhr.setRequestHeader('Range', `bytes=0-`);
                            xhr.send(null);

                            // Supports range requests
                            contentLength = xhr.getResponseHeader('Content-Length');
                            if (contentLength !== null && xhr.status == 206) {
                                const result = mod._malloc(2 * 8);
                                mod.HEAPF64[(result >> 3) + 0] = +contentLength;
                                mod.HEAPF64[(result >> 3) + 1] = 0;
                                return result;
                            }
                        } catch (e: any) {
                            error = e;
                            console.warn(`HEAD request with range header failed: ${e}`);
                        }
                    }

                    // Try to fallback to full read?
                    if (file.allowFullHttpReads) {
                        {
                            // 2. Send a dummy GET range request querying the first byte of the file
                            //          -> good IFF status is 206 and contentLenght2 is 1
                            //          -> otherwise, iff 200 and contentLenght2 == contentLenght
                            //                 we just downloaded the file, save it and move further
                            const xhr = new XMLHttpRequest();
                            if (file.dataProtocol == DuckDBDataProtocol.S3) {
                                xhr.open('GET', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                                addS3Headers(xhr, file.s3Config, file.dataUrl!, 'GET');
                            } else {
                                xhr.open('GET', file.dataUrl!, false);
                            }
                            xhr.responseType = 'arraybuffer';
                            xhr.setRequestHeader('Range', `bytes=0-0`);
                            xhr.send(null);
                            const contentRange = xhr.getResponseHeader('Content-Range')?.split('/')[1];
                            const contentLength2 = xhr.getResponseHeader('Content-Length');

                            let presumedLength = null;
                            if (contentRange !== undefined) {
                                presumedLength = contentRange;
                            } else if (!file.reliableHeadRequests) {
                                // Send a dummy HEAD request with range protocol
                                //          -> good IFF status is 206 and contentLenght is present
                                const head = new XMLHttpRequest();
                                if (file.dataProtocol == DuckDBDataProtocol.S3) {
                                    head.open('HEAD', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                                    addS3Headers(head, file.s3Config, file.dataUrl!, 'HEAD');
                                } else {
                                    head.open('HEAD', file.dataUrl!, false);
                                }
                                head.setRequestHeader('Range', `bytes=0-`);
                                head.send(null);

                                // Supports range requests
                                contentLength = head.getResponseHeader('Content-Length');
                                if (contentLength !== null && +contentLength > 1) {
                                    presumedLength = contentLength;
                                }
                            }

                            if (
                                xhr.status == 206 &&
                                contentLength2 !== null &&
                                +contentLength2 == 1 &&
                                presumedLength !== null
                            ) {
                                const result = mod._malloc(2 * 8);
                                mod.HEAPF64[(result >> 3) + 0] = +presumedLength;
                                mod.HEAPF64[(result >> 3) + 1] = 0;
                                return result;
                            }
                            if (
                                xhr.status == 200 &&
                                contentLength2 !== null &&
                                contentLength !== null &&
                                +contentLength2 == +contentLength
                            ) {
                                console.warn(`fall back to full HTTP read for: ${file.dataUrl}`);
                                const data = mod._malloc(xhr.response.byteLength);
                                const src = new Uint8Array(xhr.response, 0, xhr.response.byteLength);
                                mod.HEAPU8.set(src, data);
                                const result = mod._malloc(2 * 8);
                                mod.HEAPF64[(result >> 3) + 0] = xhr.response.byteLength;
                                mod.HEAPF64[(result >> 3) + 1] = data;
                                return result;
                            }
                        }
                        console.warn(`falling back to full HTTP read for: ${file.dataUrl}`);
                        // 3. Send non-range request
                        const xhr = new XMLHttpRequest();
                        if (file.dataProtocol == DuckDBDataProtocol.S3) {
                            xhr.open('GET', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                            addS3Headers(xhr, file.s3Config, file.dataUrl!, 'GET');
                        } else {
                            xhr.open('GET', file.dataUrl!, false);
                        }
                        xhr.responseType = 'arraybuffer';
                        xhr.send(null);

                        // Return buffer
                        if (xhr.status == 200) {
                            const data = mod._malloc(xhr.response.byteLength);
                            const src = new Uint8Array(xhr.response, 0, xhr.response.byteLength);
                            mod.HEAPU8.set(src, data);
                            const result = mod._malloc(2 * 8);
                            mod.HEAPF64[(result >> 3) + 0] = xhr.response.byteLength;
                            mod.HEAPF64[(result >> 3) + 1] = data;
                            return result;
                        }
                    }

                    // Raise error?
                    if (error != null) {
                        throw new Error(`Reading file ${file.fileName} failed with error: ${error}`);
                    }
                    return 0;
                }
                // File reader File
                case DuckDBDataProtocol.BROWSER_FILEREADER: {
                    const handle = BROWSER_RUNTIME._files?.get(file.fileName);
                    if (handle) {
                        const result = mod._malloc(2 * 8);
                        mod.HEAPF64[(result >> 3) + 0] = handle.size;
                        mod.HEAPF64[(result >> 3) + 1] = 0;
                        return result;
                    }

                    // Depending on file flags, return nullptr
                    if (flags & FileFlags.FILE_FLAGS_NULL_IF_NOT_EXISTS) {
                       return 0;
                    }

                    // Fall back to empty buffered file in the browser
                    console.warn(`Buffering missing file: ${file.fileName}`);
                    const result = mod._malloc(2 * 8);
                    const buffer = mod._malloc(1); // malloc(0) is allowed to return a nullptr
                    mod.HEAPF64[(result >> 3) + 0] = 1;
                    mod.HEAPF64[(result >> 3) + 1] = buffer;
                    return result;
                }
                case DuckDBDataProtocol.BROWSER_FSACCESS: {
                    const handle: FileSystemSyncAccessHandle = BROWSER_RUNTIME._files?.get(file.fileName);
                    if (!handle) {
                        throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
                    }
                    if (flags & FileFlags.FILE_FLAGS_FILE_CREATE_NEW) {
                        handle.truncate(0);
                    }
                    const result = mod._malloc(2 * 8);
                    const fileSize = handle.getSize();
                    mod.HEAPF64[(result >> 3) + 0] = fileSize;
                    mod.HEAPF64[(result >> 3) + 1] = 0;
                    return result;
                }
            }
        } catch (e: any) {
            // TODO (samansmink): this path causes the WASM code to hang
            console.error(e.toString());
            failWith(mod, e.toString());
        }
        return 0;
    },
    glob: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = readString(mod, pathPtr, pathLen);
            // Starts with http?
            // Try a HTTP HEAD request
            if (path.startsWith('http') || path.startsWith('s3://')) {
                // Send a dummy range request querying the first byte of the file
                const xhr = new XMLHttpRequest();
                if (path.startsWith('s3://')) {
                    const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
                    xhr.open('HEAD', getHTTPUrl(globalInfo?.s3Config, path), false);
                    addS3Headers(xhr, globalInfo?.s3Config, path, 'HEAD');
                } else {
                    xhr.open('HEAD', path!, false);
                }
                xhr.send(null);
                if (xhr.status != 200 && xhr.status !== 206) {
                    // Pre-signed resources on S3 in common configurations fail on any HEAD request
                    // https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/s3-example-presigned-urls.html
                    // so we need (if enabled) to bump to a ranged GET
                    if (!BROWSER_RUNTIME.getGlobalFileInfo(mod)?.allowFullHttpReads) {
                        console.log(`HEAD request failed: ${path}, with full http reads are disabled`);
                        return 0;
                    }
                    const xhr2 = new XMLHttpRequest();
                    if (path.startsWith('s3://')) {
                        const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
                        xhr2.open('GET', getHTTPUrl(globalInfo?.s3Config, path), false);
                        addS3Headers(xhr2, globalInfo?.s3Config, path, 'HEAD');
                    } else {
                        xhr2.open('GET', path!, false);
                    }
                    xhr2.setRequestHeader('Range', `bytes=0-0`);
                    xhr2.send(null);
                    if (xhr2.status != 200 && xhr2.status !== 206) {
                        console.log(`HEAD and GET requests failed: ${path}`);
                        return 0;
                    }
                    const contentLength = xhr2.getResponseHeader('Content-Length');
                    if (contentLength && +contentLength > 1) {
                        console.warn(
                            `Range request for ${path} did not return a partial response: ${xhr2.status} "${xhr2.statusText}"`,
                        );
                    }
                }
                mod.ccall('duckdb_web_fs_glob_add_path', null, ['string'], [path]);
            } else {
                for (const [filePath] of BROWSER_RUNTIME._files!.entries() || []) {
                    if (filePath.startsWith(path)) {
                        mod.ccall('duckdb_web_fs_glob_add_path', null, ['string'], [filePath]);
                    }
                }
            }
        } catch (e: any) {
            console.log(e);
            failWith(mod, e.toString());
            return 0;
        }
    },
    checkFile: (mod: DuckDBModule, pathPtr: number, pathLen: number): boolean => {
        try {
            const path = readString(mod, pathPtr, pathLen);
            // Starts with http or S3?
            // Try a HTTP HEAD request
            if (path.startsWith('http') || path.startsWith('s3://')) {
                // Send a dummy range request querying the first byte of the file
                const xhr = new XMLHttpRequest();
                if (path.startsWith('s3://')) {
                    const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
                    xhr.open('HEAD', getHTTPUrl(globalInfo?.s3Config, path), false);
                    addS3Headers(xhr, globalInfo?.s3Config, path, 'HEAD');
                } else {
                    xhr.open('HEAD', path!, false);
                }
                xhr.send(null);
                return xhr.status == 206 || xhr.status == 200;
            } else {
                return BROWSER_RUNTIME._files.has(path);
            }
        } catch (e: any) {
            console.log(e);
            return false;
        }
        return false;
    },
    syncFile: (_mod: DuckDBModule, _fileId: number) => {},
    closeFile: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        BROWSER_RUNTIME._fileInfoCache.delete(fileId);
        try {
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.BUFFER:
                case DuckDBDataProtocol.HTTP:
                case DuckDBDataProtocol.S3:
                    break;
                case DuckDBDataProtocol.NODE_FS:
                case DuckDBDataProtocol.BROWSER_FILEREADER:
                    // XXX Remove from registry
                    return;
                case DuckDBDataProtocol.BROWSER_FSACCESS: {
                    const handle: FileSystemSyncAccessHandle = BROWSER_RUNTIME._files?.get(file.fileName);
                    if (!handle) {
                        throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
                    }
                    return handle.flush();
                }
            }
        } catch (e: any) {
            console.log(e);
            failWith(mod, e.toString());
        }
    },
    dropFile: (mod: DuckDBModule, fileNamePtr: number, fileNameLen: number) => {
        const fileName = readString(mod, fileNamePtr, fileNameLen);
        const handle: FileSystemSyncAccessHandle = BROWSER_RUNTIME._files?.get(fileName);
        if (handle) {
            BROWSER_RUNTIME._files.delete(fileName);
            if (handle instanceof FileSystemSyncAccessHandle) {
                try {
                    handle.flush();
                    handle.close();
                } catch (e: any) {
                    throw new Error(`Cannot drop file with name: ${fileName}`);
                }
            }
            if (handle instanceof Blob) {
                // nothing
            }
        }
    },
    truncateFile: (mod: DuckDBModule, fileId: number, newSize: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
            case DuckDBDataProtocol.HTTP:
                failWith(mod, `Cannot truncate a http file`);
                return;
            case DuckDBDataProtocol.S3:
                failWith(mod, `Cannot truncate an s3 file`);
                return;
            case DuckDBDataProtocol.BUFFER:
            case DuckDBDataProtocol.NODE_FS:
            case DuckDBDataProtocol.BROWSER_FILEREADER:
                failWith(mod, `truncateFile not implemented`);
                return;
            case DuckDBDataProtocol.BROWSER_FSACCESS: {
                const handle = BROWSER_RUNTIME._files?.get(file.fileName);
                if (!handle) {
                    throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
                }
                return handle.truncate(newSize);
            }
        }
        return 0;
    },
    readFile(mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) {
        if (bytes == 0) {
            // Be robust to empty reads
            return 0;
        }
        try {
            const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                // File reading from BLOB or HTTP MUST be done with range requests.
                // We have to check in OPEN if such file supports range requests and upgrade to BUFFER if not.
                case DuckDBDataProtocol.HTTP:
                case DuckDBDataProtocol.S3: {
                    if (!file.dataUrl) {
                        throw new Error(`Missing data URL for file ${fileId}`);
                    }
                    try {
                        const xhr = new XMLHttpRequest();
                        if (file.dataProtocol == DuckDBDataProtocol.S3) {
                            xhr.open('GET', getHTTPUrl(file?.s3Config, file.dataUrl!), false);
                            addS3Headers(xhr, file?.s3Config, file.dataUrl!, 'GET');
                        } else {
                            xhr.open('GET', file.dataUrl!, false);
                        }
                        xhr.responseType = 'arraybuffer';
                        xhr.setRequestHeader('Range', `bytes=${location}-${location + bytes - 1}`);
                        xhr.send(null);
                        if (
                            xhr.status == 206 /* Partial content */ ||
                            (xhr.status == 200 && bytes == xhr.response.byteLength && location == 0)
                        ) {
                            const src = new Uint8Array(xhr.response, 0, Math.min(xhr.response.byteLength, bytes));
                            mod.HEAPU8.set(src, buf);
                            return src.byteLength;
                        } else if (xhr.status == 200) {
                            // TODO: here we are actually throwing away all non-relevant bytes, but this is still better than failing
                            //       proper solution would require notifying duckdb-wasm cache, while we are piggybackign on browser cache
                            console.warn(
                                `Range request for ${file.dataUrl} did not return a partial response: ${xhr.status} "${xhr.statusText}"`,
                            );
                            const src = new Uint8Array(
                                xhr.response,
                                location,
                                Math.min(xhr.response.byteLength - location, bytes),
                            );
                            mod.HEAPU8.set(src, buf);
                            return src.byteLength;
                        } else {
                            throw new Error(
                                `Range request for ${file.dataUrl} did returned non-success status: ${xhr.status} "${xhr.statusText}"`,
                            );
                        }
                    } catch (e) {
                        console.log(e);
                        throw new Error(`Range request for ${file.dataUrl} failed with error: ${e}"`);
                    }
                }
                case DuckDBDataProtocol.BROWSER_FILEREADER: {
                    const handle = BROWSER_RUNTIME._files?.get(file.fileName);
                    if (!handle) {
                        throw new Error(`No HTML5 file registered with name: ${file.fileName}`);
                    }
                    const sliced = handle!.slice(location, location + bytes);
                    const data = new Uint8Array(new FileReaderSync().readAsArrayBuffer(sliced));
                    mod.HEAPU8.set(data, buf);
                    return data.byteLength;
                }
                case DuckDBDataProtocol.BROWSER_FSACCESS: {
                    const handle: FileSystemSyncAccessHandle = BROWSER_RUNTIME._files.get(file.fileName);
                    if (!handle) {
                        throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
                    }
                    const out = mod.HEAPU8.subarray(buf, buf + bytes);
                    return handle.read(out, { at: location });
                }
            }
            return 0;
        } catch (e: any) {
            console.log(e);
            failWith(mod, e.toString());
            return 0;
        }
    },
    writeFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
            case DuckDBDataProtocol.HTTP:
                failWith(mod, 'Cannot write to HTTP file');
                return 0;
            case DuckDBDataProtocol.S3: {
                const buffer = mod.HEAPU8.subarray(buf, buf + bytes);
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', getHTTPUrl(file?.s3Config, file.dataUrl!), false);
                addS3Headers(xhr, file?.s3Config, file.dataUrl!, 'PUT', '', buffer);
                xhr.send(buffer);
                if (xhr.status !== 200) {
                    failWith(mod, 'Failed writing file: HTTP ' + xhr.status);
                    return 0;
                }
                return bytes;
            }
            case DuckDBDataProtocol.BROWSER_FILEREADER:
                failWith(mod, 'cannot write using the html5 file reader api');
                return 0;
            case DuckDBDataProtocol.BROWSER_FSACCESS: {
                const handle: FileSystemSyncAccessHandle = BROWSER_RUNTIME._files?.get(file.fileName);
                if (!handle) {
                    throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
                }
                const input = mod.HEAPU8.subarray(buf, buf + bytes);
                return handle.write(input, { at: location });
            }
        }
        return 0;
    },
    getLastFileModificationTime: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
            case DuckDBDataProtocol.BROWSER_FILEREADER: {
                const handle = BROWSER_RUNTIME._files?.get(file.fileName);
                if (!handle) {
                    throw Error(`No handle available for file: ${file.fileName}`);
                }
                return 0;
            }

            case DuckDBDataProtocol.HTTP:
            case DuckDBDataProtocol.S3:
                return new Date().getTime();
        }
        return 0;
    },
    progressUpdate: (done: number, percentage: number, repeat: number): void => {
        if (postMessage) {
            postMessage({
                requestId: 0,
                type: WorkerResponseType.PROGRESS_UPDATE,
                data: { status: done ? 'completed' : 'in-progress', percentage: percentage, repetitions: repeat },
            });
        }
    },
    checkDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`checkDirectory: ${path}`);
        return false;
    },
    createDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`createDirectory: ${path}`);
    },
    removeDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`removeDirectory: ${path}`);
    },
    listDirectoryEntries: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`listDirectoryEntries: ${path}`);
        return false;
    },
    moveFile: (mod: DuckDBModule, fromPtr: number, fromLen: number, toPtr: number, toLen: number) => {
        const from = readString(mod, fromPtr, fromLen);
        const to = readString(mod, toPtr, toLen);
        const handle = BROWSER_RUNTIME._files?.get(from);
        if (handle !== undefined) {
            BROWSER_RUNTIME._files!.delete(handle);
            BROWSER_RUNTIME._files!.set(to, handle);
        }
        for (const [key, value] of BROWSER_RUNTIME._fileInfoCache?.entries() || []) {
            if (value.dataUrl == from) {
                BROWSER_RUNTIME._fileInfoCache.delete(key);
                break;
            }
        }
        return true;
    },
    removeFile: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    callScalarUDF: (
        mod: DuckDBModule,
        response: number,
        funcId: number,
        descPtr: number,
        descSize: number,
        ptrsPtr: number,
        ptrsSize: number,
    ): void => {
        udf.callScalarUDF(BROWSER_RUNTIME, mod, response, funcId, descPtr, descSize, ptrsPtr, ptrsSize);
    },
};

export default BROWSER_RUNTIME;
