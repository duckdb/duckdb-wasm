import * as faker from 'faker';

export function shuffle<T>(array: T[]): T[] {
    for (let i = 0; i < array.length; ++i) {
        const j = Math.floor(faker.datatype.number(i));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
