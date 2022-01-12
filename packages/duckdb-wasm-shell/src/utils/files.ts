import * as duckdb from '@duckdb/duckdb-wasm';
import * as model from '../model';

export function pickFiles(db: duckdb.AsyncDuckDB): Promise<number> {
    return new Promise<number>((resolve, _reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async function () {
            const files = input.files as FileList;
            const fileInfos: Array<model.FileInfo> = [];
            for (let i = 0; i < files.length; ++i) {
                const file = files.item(i)!;
                await db.dropFile(file.name);
                await db.registerFileHandle(file.name, file);
                fileInfos.push({
                    name: file.name,
                    url: file.name,
                    size: file.size,
                    fileStatsEnabled: false,
                });
            }
            console.log('received');
            console.log(fileInfos);
            resolve(fileInfos.length);
        };
        input.onabort = function () {
            console.log('abort');
            resolve(0);
        };
        input.click();
    });
}
