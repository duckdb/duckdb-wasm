import * as duckdb from '@duckdb/duckdb-wasm';

export function pickFiles(db: duckdb.AsyncDuckDB): Promise<number> {
    return new Promise<number>((resolve, _reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async function () {
            const files = input.files as FileList;
            for (let i = 0; i < files.length; ++i) {
                const file = files.item(i)!;
                await db.dropFile(file.name);
                await db.registerFileHandle(file.name, file);
            }
            resolve(files.length);
        };
        input.onabort = function () {
            console.log('abort');
            resolve(0);
        };
        input.click();
    });
}
