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

function getTypeSize(ptype: string) {
    switch (ptype) {
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

function ptrToArray(mod: DuckDBModule, ptr: number, ptype: string, n: number) {
    const heap = mod.HEAPU8.subarray(ptr, ptr + n * getTypeSize(ptype));
    switch (ptype) {
        case 'UINT8':
            return new Uint8Array(heap.buffer, heap.byteOffset, n);
        case 'INT8':
            return new Int8Array(heap.buffer, heap.byteOffset, n);
        case 'INT32':
            return new Int32Array(heap.buffer, heap.byteOffset, n);
        case 'FLOAT':
            return new Float32Array(heap.buffer, heap.byteOffset, n);
        case 'DOUBLE':
            return new Float64Array(heap.buffer, heap.byteOffset, n);
        case 'VARCHAR':
            return new Float64Array(heap.buffer, heap.byteOffset, n);
        default:
            return new Array<string>(0); // cough
    }
}

interface ArgumentTypeDescription {
    logicalType: string;
    physicalType: string;
    validityBuffer: number;
    dataBuffer: number;
    lengthBuffer: number;
}

interface ReturnTypeDescription {
    logicalType: string;
    physicalType: string;
}

interface SchemaDescription {
    rows: number;
    args: ArgumentTypeDescription[];
    ret: ReturnTypeDescription;
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
        const desc = JSON.parse(desc_str) as SchemaDescription;

        // array of buffer pointers referred to from schema
        const ptrs = ptrToArray(mod, ptrsPtr, 'DOUBLE', ptrsSize / 8) as Float64Array;

        // Create argument arrays
        const argValidity = [];
        const argData = [];
        for (let i = 0; i < desc.args.length; ++i) {
            const arg = desc.args[i];
            const data = ptrToArray(mod, ptrs[arg.dataBuffer] as number, arg.physicalType, desc.rows);
            const validity = ptrToArray(mod, ptrs[arg.validityBuffer] as number, 'UINT8', desc.rows);

            if (data.length == 0 || validity.length == 0) {
                storeError(mod, response, "Can't create physical arrays for argument " + arg.physicalType);
                return;
            }
            argValidity.push(validity);

            switch (arg.physicalType) {
                case 'VARCHAR': {
                    // Get dedicated array storing the string lengths
                    const length_arr = ptrToArray(mod, ptrs[arg.lengthBuffer] as number, 'DOUBLE', desc.rows);
                    const string_data_arr = [];

                    // Decode all strings using the text decoder
                    const decoder = new TextDecoder();
                    for (let j = 0; j < desc.rows; ++j) {
                        if (!validity[j]) {
                            string_data_arr.push(undefined);
                            continue;
                        }
                        const subarray = mod.HEAPU8.subarray(
                            data[j] as number,
                            (data[j] as number) + (length_arr[j] as number),
                        );
                        const str = decoder.decode(subarray);
                        string_data_arr.push(str);
                    }
                    argData.push(string_data_arr);
                    break;
                }
                default: {
                    argData.push(data);
                }
            }
        }

        // Prepare result buffers
        // TODO: we probably do not want to recreate those every time
        const resultDataLen = desc.rows * getTypeSize(desc.ret.physicalType);
        const resultDataPtr = mod._malloc(resultDataLen);
        const resultData = ptrToArray(mod, resultDataPtr, desc.ret.physicalType, desc.rows);
        const resultValidityPtr = mod._malloc(desc.rows);
        const resultValidity = ptrToArray(mod, resultValidityPtr, 'UINT8', desc.rows);
        if (resultData.length == 0 || resultValidity.length == 0) {
            storeError(mod, response, "Can't create physical arrays for result");
            return;
        }
        let rawResultData = resultData;
        if (desc.ret.physicalType == 'VARCHAR') {
            rawResultData = new Array<string>(desc.rows);
        }

        // Prepare the arguments
        const args = [];
        for (let i = 0; i < desc.args.length; ++i) {
            args.push(null);
        }

        // Call the function
        for (let i = 0; i < desc.rows; ++i) {
            for (let j = 0; j < desc.args.length; ++j) {
                args[j] = argValidity[j][i] ? argData[j][i] : null;
            }
            const res = udf.func(...args);
            rawResultData[i] = res;
            resultValidity[i] = res === undefined || res === null ? 0 : 1;
        }

        // Encode return values
        let resultLengthsPtr = 0;
        switch (desc.ret.physicalType) {
            case 'VARCHAR': {
                // Allocate  result buffers
                const resultDataUTF8 = new Array<Uint8Array>(0); // cough
                resultLengthsPtr = mod._malloc(desc.rows * getTypeSize('DOUBLE'));
                const resultLengths = ptrToArray(mod, resultLengthsPtr, 'DOUBLE', desc.rows);

                // TODO: We need two loops to figure out the total length but maybe we can avoid the double allocation
                let totalLength = 0;
                const enc = new TextEncoder();
                for (let row_idx = 0; row_idx < desc.rows; ++row_idx) {
                    resultDataUTF8[row_idx] = enc.encode(rawResultData[row_idx] as unknown as string);
                    resultLengths[row_idx] = resultDataUTF8[row_idx].length;
                    totalLength += resultDataUTF8[row_idx].length;
                }

                // We malloc a buffer for the strings to live in for now
                const resultStringPtr = mod._malloc(totalLength);
                const resultStringBuf = mod.HEAPU8.subarray(resultStringPtr, resultStringPtr + totalLength);

                // Now copy all the strings to the new buffer back to back
                let writerOffset = 0;
                for (let rowIdx = 0; rowIdx < desc.rows; ++rowIdx) {
                    resultData[rowIdx] = writerOffset;
                    const resultUTF8 = resultDataUTF8[rowIdx];
                    const writer = resultStringBuf.subarray(writerOffset, writerOffset + resultUTF8.length);
                    writer.set(resultUTF8);
                    writerOffset += resultUTF8.length;
                }
            }
        }

        // Need to store three pointers, data, validity and length
        const retLen = 3 * 8;
        const retPtr = mod._malloc(retLen);
        const retBuffer = ptrToArray(mod, retPtr, 'DOUBLE', 3);
        retBuffer[0] = resultDataPtr;
        retBuffer[1] = resultValidityPtr;
        retBuffer[2] = resultLengthsPtr;

        mod.HEAPF64[(response >> 3) + 0] = 0; // status
        mod.HEAPF64[(response >> 3) + 1] = retPtr;
        mod.HEAPF64[(response >> 3) + 2] = 0;
    } catch (e: any) {
        storeError(mod, response, e.toString());
    }
}
