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
        case 'UINT8':
        case 'INT8':
            return 1;
        case 'INT32':
        case 'FLOAT':
            return 4;
        case 'INT64':
        case 'UINT64':
        case 'DOUBLE':
        case 'VARCHAR':
            return 8;
        default:
            return 0;
    }
}

function ptr_to_arr(mod: DuckDBModule, ptr: number, ptype: string, n:number) {
    const in_buf = mod.HEAPU8.subarray(ptr, ptr + n * type_size(ptype));

    switch(ptype) {
        case 'UINT8': {
            return new Uint8Array(in_buf.buffer, in_buf.byteOffset, n);
        }
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
        case 'VARCHAR': {
            return new Float64Array(in_buf.buffer, in_buf.byteOffset, n);
        }
        default:
            return new Array<string>(0); // cough
    }
}

// this is called from webdb.cc/CallScalarUDFFunction, changes here need to be matched there
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
        //console.log(desc);

        // array of buffer pointers referred to from schema
        const ptrs = ptr_to_arr(mod, ptrsPtr, 'DOUBLE', ptrsSize/8);

        const validity_arr = [];
        const data_arr = [];

        // create argument arrays
        for (const idx in desc.args) {
            const arg = desc.args[idx];
            const arg_arr = ptr_to_arr(mod, ptrs[arg.data_buffer] as number, arg.physical_type, desc.rows);
            const validity = ptr_to_arr(mod, ptrs[arg.validity_buffer] as number, 'UINT8', desc.rows);

            if (arg_arr.length == 0 || validity.length == 0) {
                storeError(mod, response, "Can't create physical arrays for argument " + arg.physical_type);
                return;
            }
            validity_arr.push(validity);

            // some special handling for more involved types
            if (arg.physical_type == 'VARCHAR') {
                const length_arr = ptr_to_arr(mod, ptrs[arg.length_buffer] as number, 'DOUBLE', desc.rows);

                const string_data_arr = [];
                const decoder = new TextDecoder();
                for (let i = 0; i < desc.rows; ++i) {
                    if (!validity[i]) {
                        string_data_arr.push(undefined);
                        continue;
                    }
                    const subarray = mod.HEAPU8.subarray(arg_arr[i] as number, (arg_arr[i] as number) + (length_arr[i] as number));
                    const str = decoder.decode(subarray);
                    string_data_arr.push(str);
                }
                data_arr.push(string_data_arr);

            } else {
                data_arr.push(arg_arr);
            }
        }

        // create output array
        // TODO we probably do not want to recreate those every time
         const out_data_len = desc.rows * type_size(desc.ret.physical_type);
        const out_data_ptr = mod._malloc(out_data_len);
        let out_data = ptr_to_arr(mod, out_data_ptr, desc.ret.physical_type, desc.rows);

        const out_validity_ptr = mod._malloc(desc.rows);
        const out_validity = ptr_to_arr(mod, out_validity_ptr, 'UINT8', desc.rows);

        // actually call the function
        if (out_data.length == 0 || out_validity.length == 0) {
            storeError(mod, response, "Can't create physical arrays for result");
            return;
        }

        const out_data_org = out_data;
        if (desc.ret.physical_type == 'VARCHAR') {
            out_data = new Array<string>(desc.rows);
        }
            // TODO can we do something with .apply() here?
        switch (desc.args.length) {
            case 0:
                for (let i = 0; i < desc.rows; ++i) {
                    const res = udf.func();
                    out_data[i] = res;
                    out_validity[i] = res == undefined ? 0 : 1;
                }
                break;
            case 1:
                for (let i = 0; i < desc.rows; ++i) {
                    const res = udf.func(validity_arr[0][i] ? data_arr[0][i] : undefined);
                    out_data[i] = res;
                    out_validity[i] = res == undefined ? 0 : 1;
                }
                break;
            case 2:
                for (let i = 0; i < desc.rows; ++i) {
                    const res = udf.func(validity_arr[0][i] ? data_arr[0][i] : undefined, validity_arr[1][i] ? data_arr[1][i] : undefined);
                    out_data[i] = res;
                    out_validity[i] = res == undefined ? 0 : 1;
                }
                break;
            default:
                storeError(mod, response, "Can't deal with argument count: " + desc.args.length);
                return;
        }

        // return value encoding. Most fun for strings so far.
        let out_len_ptr = 0;
        if (desc.ret.physical_type == 'VARCHAR') {
            const enc = new TextEncoder();
            const utf_arrs = new Array<Uint8Array>(0); // cough
            let total_len = 0;
            out_len_ptr = mod._malloc(desc.rows * type_size('DOUBLE'));
            const out_len = ptr_to_arr(mod, out_len_ptr, 'DOUBLE', desc.rows);

            // TODO we need two loops to figure out the total length but maybe we can avoid the double allocation
            for (let row_idx = 0; row_idx < desc.rows; ++row_idx) {
                utf_arrs[row_idx] = enc.encode(out_data[row_idx] as unknown as string);
                total_len += utf_arrs[row_idx].length;
                out_len[row_idx] = utf_arrs[row_idx].length;
            }

            // we malloc a buffer for the strings to live in for now
            const out_string_ptr = mod._malloc(total_len);
            const out_string_buf = mod.HEAPU8.subarray(out_string_ptr, out_string_ptr + total_len);
            // now copy all the strings to the new buffer back to back and fill the out_data and out_length arrays
            let out_offset = 0;
            out_data = out_data_org;

            for (let row_idx = 0; row_idx < desc.rows; ++row_idx) {
                out_data[row_idx] = out_string_ptr + out_offset;
                for (let char_idx = 0; char_idx < utf_arrs[row_idx].length; char_idx++) {
                    out_string_buf[out_offset + char_idx] = utf_arrs[row_idx][char_idx];
                }
                out_offset += utf_arrs[row_idx].length;
            }
        }

        const out_len = 3*8; // need to store three pointers, data, validity and length
        // TODO maybe we can re-use this buffer, too
        const out_ptr = mod._malloc(out_len);
        const out_arr = ptr_to_arr(mod, out_ptr, 'DOUBLE', 3);

        out_arr[0] = out_data_ptr;
        out_arr[1] = out_validity_ptr;
        out_arr[2] = out_len_ptr;

        mod.HEAPF64[(response >> 3) + 0] = 0; // status
        mod.HEAPF64[(response >> 3) + 1] = out_ptr;
        mod.HEAPF64[(response >> 3) + 2] = 0;
    } catch (e: any) {
        storeError(mod, response, e.toString());
    }
}
