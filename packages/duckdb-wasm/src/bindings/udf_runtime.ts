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

function type_size(ptype: string) {
    switch(ptype) {
        case 'INT8':
            return 1;
        case 'INT32':
            return 4;
        case 'FLOAT':
            return 4;
        case 'DOUBLE':
            return 8;
        default:
            return 0;
    }
}

function ptr_to_arr(mod: DuckDBModule, ptr: number, ptype: string, n:number) {
    const in_buf = mod.HEAPU8.subarray(ptr, ptr + n * type_size(ptype));

    switch(ptype) {
        case 'INT8': {
            return new Int8Array(in_buf.buffer, in_buf.byteOffset, n);
        }
        case 'INT32': {
            return new Int32Array(in_buf.buffer, in_buf.byteOffset, n);
        }
        case 'FLOAT': {
            return new Float32Array(in_buf.buffer, in_buf.byteOffset, n);
        }
        case 'DOUBLE': {
            return new Float64Array(in_buf.buffer, in_buf.byteOffset, n);
        }
        default:
            return undefined;
    }
}

export function callScalarUDF(
    runtime: DuckDBRuntime,
    mod: DuckDBModule,
    response: number,
    funcId: number,
    descPtr: number,
    descSize: number,
    ptrsPtr: number,
    ptrsSize: number,
) {
    try {
        const udf = runtime._udfFunctions.get(funcId);
        if (!udf) {
            storeError(mod, response, 'Unknown UDF with id: ' + funcId);
            return;
        }

        // schema description as json
        const desc_str = new TextDecoder().decode(mod.HEAPU8.subarray(descPtr, descPtr + descSize));
        const desc = JSON.parse(desc_str);

        // array of buffer pointers referred to from schema
        const ptrs_buf = mod.HEAPU8.subarray(ptrsPtr, ptrsPtr + ptrsSize);
        const ptrs = new BigUint64Array(ptrs_buf.buffer, ptrs_buf.byteOffset, ptrsSize / 8);
        const in_arr = [];
        const validity_arr = [];

        // create argument arrays
        for (const idx in desc.args) {
            const arg = desc.args[idx];
            const arg_arr = ptr_to_arr(mod, Number(ptrs[arg.data_buffer]), arg.physical_type, desc.rows);
            // TODO check if there are any NULLs
            const validity = ptr_to_arr(mod, Number(ptrs[arg.validity_buffer]), 'INT8', desc.rows);

            if (!arg_arr || !validity) {
                storeError(mod, response, "Can't create physical arrays for argument");
                return;
            }
            in_arr.push(arg_arr);
            validity_arr.push(validity);

        }

        // console.log(desc);

        // create output array
        const outLen = desc.rows * type_size(desc.ret.physical_type);
        const outAddr = mod._malloc(outLen);
        const out = ptr_to_arr(mod, outAddr, desc.ret.physical_type, desc.rows);

        // actually call the function
        if (!out) {
            storeError(mod, response, "Can't create physical arrays for result");
            return;
        } else {
            // TODO can we do something with .apply() here?
            switch (desc.args.length) {
                case 0:
                    for (let i = 0; i < desc.rows; ++i) {
                        out[i] = udf.func();
                    }
                    break;
                case 1:
                    for (let i = 0; i < desc.rows; ++i) {
                        out[i] = udf.func(validity_arr[0][i] ? in_arr[0][i] : undefined);
                    }
                    break;
                case 2:
                    for (let i = 0; i < desc.rows; ++i) {
                        out[i] = udf.func(validity_arr[0][i] ? in_arr[0][i] : undefined, validity_arr[1][i] ? in_arr[1][i] : undefined);
                    }
                    break;
                default:
                    storeError(mod, response, "Can't deal with argument count: " + desc.args.length);
                    return;
            }
        }

        mod.HEAPF64[(response >> 3) + 0] = 0;
        mod.HEAPF64[(response >> 3) + 1] = outAddr;
        mod.HEAPF64[(response >> 3) + 2] = outLen;
    } catch (e: any) {
        storeError(mod, response, e.toString());
    }
}
