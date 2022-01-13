import { PACKAGE_NAME, PACKAGE_VERSION } from './version';

// Platform check taken from here:
// https://github.com/xtermjs/xterm.js/blob/master/src/common/Platform.ts#L21

interface INavigator {
    userAgent: string;
    language: string;
    platform: string;
}

// We're declaring a navigator global here as we expect it in all runtimes (node and browser), but
// we want this module to live in common.
declare const navigator: INavigator;

const isNode = typeof navigator === 'undefined' ? true : false;
const userAgent = isNode ? 'node' : navigator.userAgent;

export const isFirefox = userAgent.includes('Firefox');
export const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

export function getJsDelivrModule(): URL {
    const jsdelivr_dist_url = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${PACKAGE_VERSION}/dist/`;
    return new URL(`${jsdelivr_dist_url}dist/shell_bg.wasm`);
}
