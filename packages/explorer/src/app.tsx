import { embed } from './embed';

const worker = new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-parallel.worker.js', import.meta.url);

const doc = document.getElementById('root');
if (!doc) {
    console.error("no element with id 'root' found");
} else {
    embed(doc!, {
        workerURL: worker,
        withNavbar: true,
    });
}
