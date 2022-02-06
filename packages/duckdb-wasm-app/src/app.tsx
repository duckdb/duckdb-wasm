import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Versus } from './pages/versus';
import { Shell } from './pages/shell';
import { Route, Routes, Navigate, BrowserRouter, useSearchParams } from 'react-router-dom';
import { withNavBar } from './components/navbar';
import { DuckDBPlatform, DuckDBProvider } from '@kimmolinna/react-duckdb';

import '../static/fonts/fonts.module.css';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'xterm/css/xterm.css';
import 'react-popper-tooltip/dist/styles.css';

import * as duckdb from '@kimmolinna/duckdb-wasm';
import duckdb_wasm from '@kimmolinna/duckdb-wasm/dist/duckdb-mvp.wasm';
import duckdb_wasm_eh from '@kimmolinna/duckdb-wasm/dist/duckdb-eh.wasm';
import duckdb_wasm_coi from '@kimmolinna/duckdb-wasm/dist/duckdb-coi.wasm';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: new URL('@kimmolinna/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', import.meta.url).toString(),
    },
    eh: {
        mainModule: duckdb_wasm_eh,
        mainWorker: new URL('@kimmolinna/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
    },
    coi: {
        mainModule: duckdb_wasm_coi,
        mainWorker: new URL('@kimmolinna/duckdb-wasm/dist/duckdb-browser-coi.worker.js', import.meta.url).toString(),
        pthreadWorker: new URL(
            '@kimmolinna/duckdb-wasm/dist/duckdb-browser-coi.pthread.worker.js',
            import.meta.url,
        ).toString(),
    },
};
const logger = new duckdb.ConsoleLogger();

type ReactiveShellProps = Record<string, string>;
export const ReactiveShell: React.FC<ReactiveShellProps> = (props: ReactiveShellProps) => {
    const [searchParams] = useSearchParams();
    const shell = () => <Shell padding={[16, 0, 0, 20]} backgroundColor="#333" />;
    if ((searchParams.get('fullscreen') || '') === 'true') {
        return shell();
    } else {
        return withNavBar(() => shell())(props);
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
    <DuckDBPlatform logger={logger} bundles={DUCKDB_BUNDLES}>
        <DuckDBProvider>
            <BrowserRouter basename={basename}>
                <Routes>
                    <Route index element={<ReactiveShell />} />
                    <Route path="/versus" element={<Versus_ />} />
                    <Route path="/table" element={<ReactiveShell />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </DuckDBProvider>
    </DuckDBPlatform>,
    element,
);
