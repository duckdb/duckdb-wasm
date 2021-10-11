import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { FileRegistryProvider, StaticOverlayProvider } from './model';
import { Benchmarks } from './benchmarks';
import { Shell } from './shell';
import { Route, Redirect, Switch, BrowserRouter } from 'react-router-dom';
import { withNavBar } from './components/navbar';
import { withBanner } from './components/banner';

import '../static/fonts/fonts.module.css';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'xterm/css/xterm.css';

import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-esm.js';
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

async function resolveDatabase(): Promise<duckdb.AsyncDuckDB> {
    const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const database = new duckdb.AsyncDuckDB(logger, worker);
    await database.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return database;
}

const Shell_ = withNavBar(
    withBanner(() => <Shell resolveDatabase={resolveDatabase} padding={[16, 0, 0, 20]} backgroundColor="#333" />),
);

const Benchmarks_ = withNavBar(() => <Benchmarks />);

const element = document.getElementById('root');
ReactDOM.render(
    <FileRegistryProvider>
        <StaticOverlayProvider>
            <BrowserRouter>
                <Switch>
                    <Route exact path="/benchmarks" component={Benchmarks_} />
                    <Route exact path="/" component={Shell_} />
                    <Redirect to="/" />
                </Switch>
            </BrowserRouter>
        </StaticOverlayProvider>
    </FileRegistryProvider>,
    element,
);
