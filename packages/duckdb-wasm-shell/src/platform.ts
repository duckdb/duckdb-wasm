import { PACKAGE_NAME, PACKAGE_VERSION } from './version';

export function getJsDelivrModule(): URL {
    const jsdelivr_dist_url = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${PACKAGE_VERSION}/dist/`;
    return new URL(`${jsdelivr_dist_url}dist/shell_bg.wasm`);
}
