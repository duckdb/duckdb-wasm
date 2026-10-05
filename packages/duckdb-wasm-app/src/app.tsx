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

import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm_base from '@duckdb/duckdb-wasm/dist/duckdb-base.wasm';
import duckdb_wasm_threads from '@duckdb/duckdb-wasm/dist/duckdb-threads.wasm';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    base: {
        mainModule: duckdb_wasm_base,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-base.worker.js', import.meta.url).toString(),
    },
    threads: {
        mainModule: duckdb_wasm_threads,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-threads.worker.js', import.meta.url).toString(),
        pthreadWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-threads.pthread.worker.js',
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
