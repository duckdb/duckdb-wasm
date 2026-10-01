import { copySyncAccessHandle } from '../src/bindings/runtime_browser';

const MB = 1024 * 1024;

/// A mock FileSystemSyncAccessHandle backed by an in-memory buffer
class FakeSyncAccessHandle implements FileSystemSyncAccessHandle {
    data: Uint8Array;

    constructor(data = new Uint8Array(0)) {
        this.data = data;
    }

    close(): void {}

    flush(): void {}

    getSize(): number {
        return this.data.length;
    }

    truncate(newSize: number): void {
        const next = new Uint8Array(newSize);
        next.set(this.data.subarray(0, Math.min(newSize, this.data.length)));
        this.data = next;
    }

    read(buffer: AllowSharedBufferSource, options?: FileSystemReadWriteOptions): number {
        const at = options?.at ?? 0;
        const view = asBytes(buffer);
        const n = Math.max(0, Math.min(view.length, this.data.length - at));
        view.set(this.data.subarray(at, at + n));
        return n;
    }

    write(buffer: AllowSharedBufferSource, options?: FileSystemReadWriteOptions): number {
        const at = options?.at ?? 0;
        const view = asBytes(buffer);
        if (at + view.length > this.data.length) {
            this.truncate(at + view.length);
        }
        this.data.set(view, at);
        return view.length;
    }
}

function asBytes(buffer: AllowSharedBufferSource): Uint8Array {
    return ArrayBuffer.isView(buffer)
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new Uint8Array(buffer as ArrayBuffer);
}

function makeFileContents(size: number): Uint8Array {
    // fill the buffer with pseudo-random data (emphasis on the pseudo). we
    // just need data that repeats on a different period than the chunk size,
    // otherwise it might mask real bugs in the implementation
    return new Uint8Array(size).map((_, idx) => idx % 251);
}

function arraysAreEqual(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function testOPFSCopy(): void {
    describe('OPFS sync access handle copy', () => {
        // The copy runs in 1 MB chunks, so sizes that are not a whole multiple
        // of the chunk size end with a short read.
        const sizes: [string, number][] = [
            ['empty', 0],
            ['smaller than one chunk', 512 * 1024],
            ['exactly one chunk', 1 * MB],
            ['one chunk plus a byte', 1 * MB + 1],
            ['one chunk plus a partial chunk', MB + 512 * 1024],
            ['exactly two chunks', 2 * MB],
            ['several chunks plus a partial chunk', 3 * MB + 524299 /* a prime, just for fun */],
        ];

        for (const [label, size] of sizes) {
            it(`copies a file (${label}: ${size} bytes)`, () => {
                const expected = makeFileContents(size);
                const from = new FakeSyncAccessHandle(expected.slice());
                const to = new FakeSyncAccessHandle(new Uint8Array(4 * MB).fill(0xff));
                copySyncAccessHandle(from, to);
                expect(to.getSize()).toEqual(size);
                expect(arraysAreEqual(expected, to.data)).toBeTrue();
            });
        }

        it('throws instead of looping forever when a read returns no bytes', () => {
            // A handle that stops yielding bytes part way through would otherwise leave
            // the loop advancing by zero on every iteration, hanging the worker.
            class StallingHandle extends FakeSyncAccessHandle {
                read(buffer: AllowSharedBufferSource, options?: FileSystemReadWriteOptions): number {
                    return (options?.at ?? 0) >= 2 * MB ? 0 : super.read(buffer, options);
                }
            }
            const from = new StallingHandle(makeFileContents(4 * MB));
            expect(() => copySyncAccessHandle(from, new FakeSyncAccessHandle())).toThrowError(/Read 0 bytes/);
        });
    });
}
