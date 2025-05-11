export const REGEX_OPFS_FILE = /'(opfs:\/\/\S*?)'/g;
export const REGEX_OPFS_PROTOCOL = /(opfs:\/\/\S*?)/g;

export function isOPFSProtocol(path: string): boolean {
    return path.search(REGEX_OPFS_PROTOCOL) > -1;
}

export function searchOPFSFiles(text: string) {
    return [...text.matchAll(REGEX_OPFS_FILE)].map(match => match[1]);
}