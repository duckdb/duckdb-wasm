import * as check from 'wasm-check';

export function checkPlatform(): boolean {
    return check.feature.exceptions;
}
