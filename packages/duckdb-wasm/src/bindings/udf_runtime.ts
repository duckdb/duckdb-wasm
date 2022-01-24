import { DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';

const TEXT_ENCODER = new TextEncoder();

function storeError(mod: DuckDBModule, response: number, message: string) {
    const msgBuffer = TEXT_ENCODER.encode(message);
    const heapAddr = mod._malloc(msgBuffer.byteLength);
    const heapArray = mod.HEAPU8.subarray(heapAddr, heapAddr + msgBuffer.byteLength);
    heapArray.set(msgBuffer);

    mod.HEAPF64[(response >> 3) + 0] = 1;
    mod.HEAPF64[(response >> 3) + 1] = heapAddr;
    mod.HEAPF64[(response >> 3) + 2] = heapArray.byteLength;
}

export function callScalarUDF(
    runtime: DuckDBRuntime,
    mod: DuckDBModule,
    response: number,
    funcId: number,
    bufferPtr: number,
    bufferSize: number,
) {
    try {
        const udf = runtime._udfFunctions.get(funcId);
        if (!udf) {
            storeError(mod, response, 'unknown udf with id: ' + funcId);
            return;
        }

        const data = mod.HEAPU8.subarray(bufferPtr, bufferPtr + bufferSize);
        const in0 = new Int32Array(data.buffer, data.byteOffset, bufferSize / 4);

        const outLen = in0.length * 4;
        const outAddr = mod._malloc(outLen);
        const outArray = mod.HEAPU8.subarray(outAddr, outAddr + outLen);
        const out = new Int32Array(outArray.buffer, outArray.byteOffset, outLen);

        for (let i = 0; i < in0.length; ++i) {
            out[i] = udf.func(in0[i]);
        }

        mod.HEAPF64[(response >> 3) + 0] = 0;
        mod.HEAPF64[(response >> 3) + 1] = outAddr;
        mod.HEAPF64[(response >> 3) + 2] = outLen;
    } catch (e: any) {
        storeError(mod, response, e.toString());
    }
}
