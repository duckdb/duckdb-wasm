import * as duckdb from '@motherduck/duckdb-wasm';

// XXX
// This is currently not working as expected since the FileSystemFileHandle
// returned by showOpenFilePicker does NOT contain the method createSyncAccessHandle ?
//
// async function pickFilesForOPFS(db: duckdb.AsyncDuckDB): Promise<number> {
//     const files: any[] = await (window as any).showOpenFilePicker({
//         multiple: true,
//     });
//     console.log(files);
//     for (let i = 0; i < files.length; ++i) {
//         const file = files[i];
//         const accessHandle = await file.createSyncAccessHandle();
//         await db.dropFile(file.name);
//         await db.registerFileHandle(file.name, accessHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
//     }
//     return files.length;
// }

function pickFilesForFileReader(db: duckdb.AsyncDuckDB): Promise<number> {
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
                await db.registerFileHandle(file.name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
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

export async function pickFiles(db: duckdb.AsyncDuckDB): Promise<number> {
    //    const w = window as any;
    //    if (typeof w.showOpenFilePicker === 'function') {
    //        return await pickFilesForOPFS(db);
    //    } else {
    //        return await pickFilesForFileReader(db);
    //    }
    return await pickFilesForFileReader(db);
}
