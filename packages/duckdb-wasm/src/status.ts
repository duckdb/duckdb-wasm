export enum StatusCode {
    SUCCESS = 0,
    MAX_ARROW_ERROR = 255,
    DUCKDB_WASM_RETRY = 256,
}

export function IsArrowBuffer(status: StatusCode): boolean {
    return status <= StatusCode.MAX_ARROW_ERROR;
}

export function IsDuckDBWasmRetry(status: StatusCode): boolean {
    return status === StatusCode.DUCKDB_WASM_RETRY;
}
