export function generateLongQueryString(): string {
    const aaa = generateRandomString(512);
    const ddd = generateRandomString(512);
    const ccc = generateRandomString(256);
    const eee = generateRandomString(128);
    const ggg = generateRandomString(64);
    const hhh = generateRandomString(32);

    return `T=Long` +
        `&T-AAA=${aaa}` +
        `&T-CCC=${ccc}` +
        `&T-DDD=${ddd}` +
        `&T-EEE=${eee}` +
        `&T-GGG=${ggg}` +
        `&T-HHH=${hhh}`;
}

export function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
