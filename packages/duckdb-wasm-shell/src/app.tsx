import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as model from './model';
import { Provider as ReduxProvider } from 'react-redux';
import Shell from './shell';
import { Route, BrowserRouter } from 'react-router-dom';
import { withNavBar } from './components/navbar';
import { withBanner } from './components/banner';

import '../static/fonts/fonts.module.css';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module.js';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb.wasm';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-next.wasm';
import duckdb_wasm_next_coi from '@duckdb/duckdb-wasm/dist/duckdb-next-coi.wasm';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    asyncDefault: {
        mainModule: duckdb_wasm,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-async.worker.js', import.meta.url).toString(),
    },
    asyncNext: {
        mainModule: duckdb_wasm_next,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-async-next.worker.js', import.meta.url).toString(),
    },
    asyncNextCOI: {
        mainModule: duckdb_wasm_next_coi,
        mainWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-async-next-coi.worker.js',
            import.meta.url,
        ).toString(),
        pthreadWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-async-next-coi.pthread.worker.js',
            import.meta.url,
        ).toString(),
    },
};

async function initDB(): Promise<duckdb.AsyncDuckDB> {
    const config = await duckdb.configure(DUCKDB_BUNDLES);
    const worker = new Worker(config.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const database = new duckdb.AsyncDuckDB(logger, worker);
    await database.open(config.mainModule, config.pthreadWorker);
    return database;
}

const PaddedShell = () => <Shell initDatabase={initDB} padding={[16, 0, 16, 20]} backgroundColor="#333" />;

const store = model.createStore();

const element = document.getElementById('root');
ReactDOM.render(
    <ReduxProvider store={store}>
        <BrowserRouter>
            <Route component={withBanner(withNavBar(PaddedShell))} />
        </BrowserRouter>
    </ReduxProvider>,
    element,
);
