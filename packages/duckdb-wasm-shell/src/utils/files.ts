import * as duckdb from '@duckdb/duckdb-wasm';
import { DuckDBDataProtocol } from '@duckdb/duckdb-wasm/dist/types/src/bindings';

export function pickFiles(db: duckdb.AsyncDuckDB): Promise<number> {
    return new Promise<number>((resolve, _reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        let closed = false;
        const finish = async () => {
            console.log(input.files);
            closed = true;
            const files = input.files as FileList;
            for (let i = 0; i < files.length; ++i) {
                const file = files.item(i)!;
                await db.dropFile(file.name);
                await db.registerFileHandle(file.name, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
            }
            resolve(files.length);
        };
        const deferredFinish = async () => {
            window.removeEventListener('focus', deferredFinish);
            if (closed) {
                return;
            }
            await new Promise(r => setTimeout(r, 1000));
            if (!closed) {
                await finish();
            }
        };
        input.onchange = async function () {
            window.removeEventListener('focus', deferredFinish);
            await finish();
        };
        input.onclick = async function () {
            window.addEventListener('focus', deferredFinish);
        };
        input.click();
    });
}
