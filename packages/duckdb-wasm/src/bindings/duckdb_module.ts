export interface PThread {
    unusedWorkers: Worker[];
    runningWorkers: Worker[];
}

export interface DuckDBModule extends EmscriptenModule {
    stackSave: typeof stackSave;
    stackAlloc: typeof stackAlloc;
    stackRestore: typeof stackRestore;
    lengthBytesUTF8: typeof lengthBytesUTF8;
    stringToUTF8: typeof stringToUTF8;

    ccall: typeof ccall;
    PThread: PThread;
    /** The memory, exported: with shared memory another thread can grow it */
    wasmMemory?: WebAssembly.Memory;

    /** The SHA-256 of the wasm module, set by builds linked with `-sCROSS_ORIGIN_STORAGE` */
    wasmHash?: WasmHash;
}

export interface WasmHash {
    algorithm: string;
    value: string;
}
