import * as duckdb from '../src/';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { mkdirSync } from 'fs';
import path from 'path';

const tmpdir = () => {
    const tmp = path.resolve(__dirname, '../test_temp');
    mkdirSync(tmp, { recursive: true });
    return tmp;
}

export function testNodeFS(db: () => duckdb.AsyncDuckDB): void {
    const files: string[] = [];

    afterAll(async () => {
        await Promise.all(files.map(file => unlink(file).catch(() => {})));
        await db().flushFiles();
        await db().dropFiles();
    });

    describe('Node FS', () => {
        it('Should not create an empty DB file in read-only mode for non-existent path', async () => {
            const tmp = tmpdir();
            const filename = `duckdb_test_${randomUUID().replace(/-/g, '')}`;
            files.push(path.join(tmp, filename));

            await expectAsync(
                db().open({
                    path: path.join(tmp, filename),
                    accessMode: duckdb.DuckDBAccessMode.READ_ONLY,
                }),
            ).toBeRejectedWithError(/database does not exist/);
        });

        it('Should create DB file in read-write mode for non-existent path', async () => {
            const tmp = tmpdir();
            const filename = `duckdb_test_${randomUUID().replace(/-/g, '')}`;
            files.push(path.join(tmp, filename));

            await expectAsync(
                db().open({
                    path: path.join(tmp, filename),
                    accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
                }),
            ).toBeResolved();
        });

        it('Should create an empty DB file in read-only mode for non-existent path with direct I/O', async () => {
            const tmp = tmpdir();
            const filename = `duckdb_test_${randomUUID().replace(/-/g, '')}`;
            files.push(path.join(tmp, filename));

            await expectAsync(
                db().open({
                    path: path.join(tmp, filename),
                    accessMode: duckdb.DuckDBAccessMode.READ_ONLY,
                    useDirectIO: true,
                }),
            ).toBeRejectedWithError(/database does not exist/);
        });

        it('Should create DB file in read-write mode for non-existent path with direct I/O', async () => {
            const tmp = tmpdir();
            const filename = `duckdb_test_${randomUUID().replace(/-/g, '')}`;
            files.push(path.join(tmp, filename));

            await expectAsync(
                db().open({
                    path: path.join(tmp, filename),
                    accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
                    useDirectIO: true,
                }),
            ).toBeResolved();
        });
    });
}
