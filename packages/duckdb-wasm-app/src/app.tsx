import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Versus } from './pages/versus';
import { Shell } from './pages/shell';
import { Route, Routes, Navigate, BrowserRouter } from 'react-router-dom';
import { NavBarContainer } from './components/navbar';
import { DuckDBConnectionProvider, DuckDBPlatform, DuckDBProvider } from '@duckdb/react-duckdb';

import '../static/fonts/fonts.module.css';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'xterm/css/xterm.css';
import 'react-popper-tooltip/dist/styles.css';

import * as duckdb from '@motherduck/duckdb-wasm';
import duckdb_wasm from '@motherduck/duckdb-wasm/dist/duckdb-mvp.wasm';
import duckdb_wasm_eh from '@motherduck/duckdb-wasm/dist/duckdb-eh.wasm';
import duckdb_wasm_coi from '@motherduck/duckdb-wasm/dist/duckdb-coi.wasm';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: new URL('@motherduck/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', import.meta.url).toString(),
    },
    eh: {
        mainModule: duckdb_wasm_eh,
        mainWorker: new URL('@motherduck/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
    },
    coi: {
        mainModule: duckdb_wasm_coi,
        mainWorker: new URL('@motherduck/duckdb-wasm/dist/duckdb-browser-coi.worker.js', import.meta.url).toString(),
        pthreadWorker: new URL(
            '@motherduck/duckdb-wasm/dist/duckdb-browser-coi.pthread.worker.js',
            import.meta.url,
        ).toString(),
    },
};
const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);

const paths = /(.*)(\/versus|\/docs\/.*|\/)$/;
const pathMatches = (window?.location?.pathname || '').match(paths);
let basename = '/';
if (pathMatches != null && pathMatches.length >= 2) {
    basename = pathMatches[1];
}

const element = document.getElementById('root');
const root = createRoot(element!);
root.render(
    <DuckDBPlatform logger={logger} bundles={DUCKDB_BUNDLES}>
        <DuckDBProvider>
            <DuckDBConnectionProvider>
                <BrowserRouter basename={basename}>
                    <Routes>
                        <Route
                            index
                            element={
                                    <Shell padding={[16, 0, 0, 20]} backgroundColor="#333" />
                            }
                        />
                        <Route
                            path="/versus"
                            element={
                                    <Versus />
                            }
                        />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </BrowserRouter>
            </DuckDBConnectionProvider>
        </DuckDBProvider>
    </DuckDBPlatform>,
);
