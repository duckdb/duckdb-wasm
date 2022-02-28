import { DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder('utf-8');

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
            return new Array<string | undefined | null>(0); // cough
    }
}

function ptrToUint8Array(mod: DuckDBModule, ptr: number, n: number) {
    const heap = mod.HEAPU8.subarray(ptr, ptr + n);
    return new Uint8Array(heap.buffer, heap.byteOffset, n);
}
function ptrToFloat64Array(mod: DuckDBModule, ptr: number, n: number) {
    const heap = mod.HEAPU8.subarray(ptr, ptr + n * 8);
    return new Float64Array(heap.buffer, heap.byteOffset, n);
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
        const descStr = TEXT_DECODER.decode(mod.HEAPU8.subarray(descPtr, descPtr + descSize));
        const desc = JSON.parse(descStr) as SchemaDescription;
        const ptrs = ptrToFloat64Array(mod, ptrsPtr, ptrsSize / 8);

        // Create argument arrays
        const argValidity = [];
        const argData = [];
        for (let i = 0; i < desc.args.length; ++i) {
            const argDesc = desc.args[i];
            const data = ptrToArray(mod, ptrs[argDesc.dataBuffer] as number, argDesc.physicalType, desc.rows);
            const validity = ptrToUint8Array(mod, ptrs[argDesc.validityBuffer] as number, desc.rows);
            if (data.length == 0 || validity.length == 0) {
                storeError(mod, response, "Can't create physical arrays for argument " + argDesc.physicalType);
                return;
            }
            argValidity.push(validity);

            switch (argDesc.physicalType) {
                case 'VARCHAR': {
                    const lengthsArray = ptrToFloat64Array(mod, ptrs[argDesc.lengthBuffer] as number, desc.rows);
                    const dataArray = [];
                    for (let j = 0; j < desc.rows; ++j) {
                        if (!validity[j]) {
                            dataArray.push(undefined);
                            continue;
                        }
                        const subarray = mod.HEAPU8.subarray(
                            data[j] as number,
                            (data[j] as number) + (lengthsArray[j] as number),
                        );
                        const str = TEXT_DECODER.decode(subarray);
                        dataArray.push(str);
                    }
                    argData.push(dataArray);
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
        const resultValidity = ptrToUint8Array(mod, resultValidityPtr, desc.rows);
        if (resultData.length == 0 || resultValidity.length == 0) {
            storeError(mod, response, "Can't create physical arrays for result");
            return;
        }
        let rawResultData = resultData;
        if (desc.ret.physicalType == 'VARCHAR') {
            rawResultData = new Array<string | undefined | null>(desc.rows);
        }

        // Call the function
        const args = [];
        for (let i = 0; i < desc.args.length; ++i) {
            args.push(null);
        }
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
                // Allocate result buffers
                const resultDataUTF8 = new Array<Uint8Array>(0); // cough
                resultLengthsPtr = mod._malloc(desc.rows * getTypeSize('DOUBLE'));
                const resultLengths = ptrToFloat64Array(mod, resultLengthsPtr, desc.rows);

                // TODO: We need two loops to figure out the total length but maybe we can avoid the double allocation
                let totalLength = 0;
                for (let row = 0; row < desc.rows; ++row) {
                    const utf8 = TEXT_ENCODER.encode((rawResultData as (string | null | undefined)[])[row] || '');
                    resultDataUTF8.push(utf8);
                    resultLengths[row] = utf8.length;
                    totalLength += utf8.length;
                }

                // We malloc a buffer for the strings to live in for now
                const resultStringPtr = mod._malloc(totalLength);
                const resultStringBuf = mod.HEAPU8.subarray(resultStringPtr, resultStringPtr + totalLength);

                // Now copy all the strings to the new buffer back to back
                let writerOffset = 0;
                for (let row = 0; row < desc.rows; ++row) {
                    resultData[row] = writerOffset;
                    const resultUTF8 = resultDataUTF8[row];
                    const writer = resultStringBuf.subarray(writerOffset, writerOffset + resultUTF8.length);
                    writer.set(resultUTF8);
                    writerOffset += resultUTF8.length;
                }
            }
        }

        // Need to store three pointers, data, validity and length
        const retLen = 3 * 8;
        const retPtr = mod._malloc(retLen);
        const retBuffer = ptrToFloat64Array(mod, retPtr, 3);
        retBuffer[0] = resultDataPtr;
        retBuffer[1] = resultValidityPtr;
        retBuffer[2] = resultLengthsPtr;

        // Pack response
        mod.HEAPF64[(response >> 3) + 0] = 0;
        mod.HEAPF64[(response >> 3) + 1] = retPtr;
        mod.HEAPF64[(response >> 3) + 2] = 0;
    } catch (e: any) {
        storeError(mod, response, e.toString());
    }
}
