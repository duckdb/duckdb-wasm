export function generateLongQueryString(): string {
    const aaa = repeatCharacter('A', 512);
    const ccc = repeatCharacter('C', 256);
    const ddd = repeatCharacter('D', 512);
    const eee = repeatCharacter('E', 256);
    const ggg = repeatCharacter('G', 128);
    const hhh = repeatCharacter('H', 64);

    return `test=inline` +
        `&Test-Security-Token=${aaa}` +
        `&Test-Algorithm=${ccc}` +
        `&Test-Date=${ddd}` +
        `&Test-SignedHeaders=host` +
        `&Test-Expires=43200` +
        `&Test-Credential=${eee}` +
        `&Test-Signature=${ggg}`;
}

export function repeatCharacter(char: string, length: number): string {
    return char.repeat(length);
}