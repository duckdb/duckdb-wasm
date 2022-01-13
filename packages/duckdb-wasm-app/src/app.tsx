import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Versus } from './pages/versus';
import { Shell } from './pages/shell';
import { Route, Routes, Navigate, BrowserRouter, useSearchParams } from 'react-router-dom';
import { withNavBar } from './components/navbar';
import { withBanner } from './components/banner';

import '../static/fonts/fonts.module.css';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'xterm/css/xterm.css';
import 'react-popper-tooltip/dist/styles.css';

import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb.wasm';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm';
import duckdb_wasm_coi from '@duckdb/duckdb-wasm/dist/duckdb-coi.wasm';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser.worker.js', import.meta.url).toString(),
    },
    eh: {
        mainModule: duckdb_wasm_eh,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
    },
    coi: {
        mainModule: duckdb_wasm_coi,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-coi.worker.js', import.meta.url).toString(),
        pthreadWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-coi.pthread.worker.js',
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

interface ReactiveShellProps {}

export const ReactiveShell: React.FC<ReactiveShellProps> = (props: ReactiveShellProps) => {
    let [searchParams] = useSearchParams();
    if ((searchParams.get('fullscreen') || '') === 'true') {
        return <Shell resolveDatabase={resolveDatabase} padding={[16, 0, 0, 20]} backgroundColor="#333" />;
    } else {
        return withNavBar(
            withBanner(() => (
                <Shell resolveDatabase={resolveDatabase} padding={[16, 0, 0, 20]} backgroundColor="#333" />
            )),
        )(props);
    }
};

const Versus_ = withNavBar(() => <Versus />);

const paths = /(.*)(\/versus|\/docs\/.*|\/)$/;
const pathMatches = (window?.location?.pathname || '').match(paths);
let basename = '/';
if (pathMatches != null && pathMatches.length >= 2) {
    basename = pathMatches[1];
}

const element = document.getElementById('root');
ReactDOM.render(
    <BrowserRouter basename={basename}>
        <Routes>
            <Route path="/versus" element={<Versus_ />} />
            <Route path="/" element={<ReactiveShell />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    </BrowserRouter>,
    element,
);
