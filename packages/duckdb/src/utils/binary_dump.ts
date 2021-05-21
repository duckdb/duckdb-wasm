export function dumpBuffer(src: Uint8Array): string {
    return [...src]
        .map(x => (x >= 32 && x <= 127 ? String.fromCharCode(x) : '.'))
        .reduce((acc: string, value: string, index: number) => {
            if (index % 20 == 0) acc += '\n';
            acc += value;
            return acc;
        }, '');
}
