import * as duckdb from '../src/';

export function testTokenization(db: () => duckdb.DuckDBBindings): void {
    describe('Tokenizer', () => {
        it('SELECT 1', async () => {
            expect(db().tokenize('SELECT 1')).toEqual({
                offsets: [0, 7],
                types: [4, 1],
            });
        });
        it('SELECT * FROM region', async () => {
            expect(db().tokenize('SELECT * FROM region')).toEqual({
                offsets: [0, 7, 9, 14],
                types: [4, 3, 4, 0],
            });
        });
    });
}

export function testTokenizationAsync(db: () => duckdb.AsyncDuckDB): void {
    describe('Tokenizer', () => {
        it('SELECT 1', async () => {
            expect(await db().tokenize('SELECT 1')).toEqual({
                offsets: [0, 7],
                types: [4, 1],
            });
        });
        it('SELECT * FROM region', async () => {
            expect(await db().tokenize('SELECT * FROM region')).toEqual({
                offsets: [0, 7, 9, 14],
                types: [4, 3, 4, 0],
            });
        });
    });
}
