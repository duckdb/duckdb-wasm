import { JsBufferFile, JsBufferFileSystem } from '../src/bindings/js_buffer_file';

/** A small deterministic generator, the test is reproducible */
function prng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

export function testJsBufferFile(): void {
    describe('js_buffer:// files', () => {
        it('behave like a sparse growable file under random writes, reads and truncates', () => {
            const random = prng(0x5eed);
            const file = new JsBufferFile();
            // The reference: a plain array of bytes, grown with zeros
            let reference = new Uint8Array(0);
            const grow = (size: number) => {
                if (size > reference.byteLength) {
                    const next = new Uint8Array(size);
                    next.set(reference);
                    reference = next;
                }
            };
            for (let step = 0; step < 1500; step++) {
                const op = random();
                if (op < 0.5) {
                    // Write a block at a random offset, up to 100KB past the end
                    const at = Math.floor(random() * (reference.byteLength + 100000));
                    const length = 1 + Math.floor(random() * 70000);
                    const block = new Uint8Array(length);
                    for (let i = 0; i < length; i++) block[i] = (at + i + step) & 0xff;
                    expect(file.write(block, { at })).toEqual(length);
                    grow(at + length);
                    reference.set(block, at);
                } else if (op < 0.85) {
                    // Read a random range, possibly past the end
                    const at = Math.floor(random() * (reference.byteLength + 1000));
                    const length = Math.floor(random() * 80000);
                    const out = new Uint8Array(length);
                    const n = file.read(out, { at });
                    const expected = Math.max(0, Math.min(length, reference.byteLength - at));
                    expect(n).toEqual(expected);
                    expect(out.subarray(0, n)).toEqual(reference.subarray(at, at + n));
                } else {
                    // Truncate: shrink or grow with zeros
                    const size = Math.floor(random() * (reference.byteLength * 1.2 + 1000));
                    file.truncate(size);
                    if (size < reference.byteLength) {
                        reference = reference.slice(0, size);
                    } else {
                        grow(size);
                    }
                }
                expect(file.getSize()).toEqual(reference.byteLength);
            }
            // The whole content matches at the end
            const all = new Uint8Array(reference.byteLength);
            expect(file.read(all, { at: 0 })).toEqual(reference.byteLength);
            expect(all).toEqual(reference);
        });

        it('zeroes the tail of a shrunk file before it grows again', () => {
            const file = new JsBufferFile();
            file.write(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), { at: 0 });
            file.truncate(4);
            file.truncate(8);
            const out = new Uint8Array(8);
            expect(file.read(out, { at: 0 })).toEqual(8);
            expect(out).toEqual(new Uint8Array([1, 2, 3, 4, 0, 0, 0, 0]));
        });

        it('keeps the files of a directory apart and lists them', () => {
            const fs = new JsBufferFileSystem();
            fs.open('js_buffer://tmp/a', true)!.write(new Uint8Array([1]), { at: 0 });
            fs.open('js_buffer://tmp/b', true)!.write(new Uint8Array([2, 2]), { at: 0 });
            fs.open('js_buffer://tmp/sub/c', true);
            expect(fs.list('js_buffer://tmp').sort()).toEqual(['a', 'b']);
            expect(fs.exists('js_buffer://tmp/a')).toBeTrue();
            // DuckDB's path joining renders a scheme without authority as js_buffer:///x
            expect(fs.exists('js_buffer:///tmp/a')).toBeTrue();
            fs.move('js_buffer://tmp/a', 'js_buffer://tmp/d');
            expect(fs.exists('js_buffer://tmp/a')).toBeFalse();
            expect(fs.get('js_buffer://tmp/d')!.getSize()).toEqual(1);
            fs.removeDirectory('js_buffer://tmp');
            expect(fs.paths()).toEqual([]);
        });
    });
}
