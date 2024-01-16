/// <reference types="emscripten" />
export interface PThread {
    unusedWorkers: Worker[];
    runningWorkers: Worker[];
}
export interface DuckDBModule extends EmscriptenModule {
    stackSave: typeof stackSave;
    stackAlloc: typeof stackAlloc;
    stackRestore: typeof stackRestore;
    ccall: typeof ccall;
    PThread: PThread;
}
