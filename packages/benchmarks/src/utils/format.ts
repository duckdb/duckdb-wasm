export enum ByteFormat {
    SI = 0,
    IEC = 1,
}

export function formatBytes(value: number, format: ByteFormat = ByteFormat.SI): string {
    const [multiple, k, suffix] = format === ByteFormat.SI ? [1000, 'k', 'B'] : [1024, 'K', 'iB'];
    const exp = (Math.log(value) / Math.log(multiple)) | 0;
    const size = Number((value / Math.pow(multiple, exp)).toFixed(2));
    return `${size} ${exp ? `${k}MGTPEZY`[exp - 1] + suffix : `byte${size !== 1 ? 's' : ''}`}`;
}

export function formatThousands(value: number): string {
    const [multiple, k] = [1000, 'k'];
    const exp = (Math.log(value) / Math.log(multiple)) | 0;
    const size = Number((value / Math.pow(multiple, exp)).toFixed(2));
    return size + (exp ? ` ${`${k}MGTPEZY`[exp - 1]}` : '');
}