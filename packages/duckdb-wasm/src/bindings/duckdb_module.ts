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
}

const HEAP_VIEWS = {
    HEAP8: Int8Array,
    HEAP16: Int16Array,
    HEAPU8: Uint8Array,
    HEAPU16: Uint16Array,
    HEAP32: Int32Array,
    HEAPU32: Uint32Array,
    HEAPF32: Float32Array,
    HEAPF64: Float64Array,
};

/**
 * Keep the module's heap views pointing at the current memory.
 *
 * With pthreads and memory growth, another thread can grow the shared memory, which leaves this
 * thread's views over the old, shorter buffer: reads past the old end come back empty and writes
 * throw "offset is out of bounds". Emscripten's own glue re-checks `wasmMemory.buffer` before every
 * heap access (GROWABLE_HEAP_*). This makes the module's views do the same check, so the bindings
 * and runtime can keep using `mod.HEAPU8` and friends directly.
 */
export function keepHeapViewsCurrent(mod: DuckDBModule): void {
    const memory = (mod as any).wasmMemory as WebAssembly.Memory | undefined;
    if (!memory || typeof SharedArrayBuffer === 'undefined' || !(memory.buffer instanceof SharedArrayBuffer)) {
        return;
    }
    for (const [name, View] of Object.entries(HEAP_VIEWS)) {
        let view: ArrayBufferView | undefined = (mod as any)[name];
        Object.defineProperty(mod, name, {
            configurable: true,
            enumerable: true,
            get: () => {
                if (!view || view.buffer !== memory.buffer) {
                    view = new View(memory.buffer);
                }
                return view;
            },
            // Emscripten still assigns fresh views when it grows the memory on this thread
            set: (fresh: ArrayBufferView) => {
                view = fresh;
            },
        });
    }
}
