import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as model from './model';
import * as duckdb from '../../duckdb/dist/duckdb.module';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb.wasm';
import Explorer from './explorer';
import AppLauncher from './app_launcher';
import { Provider as ReduxProvider } from 'react-redux';
import { AppContextProvider, IAppContext } from './app_context';
import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import { withNavBar } from './components';

import './theme.css';

import 'bootstrap/dist/css/bootstrap.css';
import 'react-resizable/css/styles.css';
import 'react-virtualized/styles.css';

export interface EmbedOptions {
    /// The URL of the DuckDB worker script
    workerURL: URL;
    /// Render with navigation bar?
    withNavbar: boolean;
}

export async function embed(element: Element, options: EmbedOptions): Promise<void> {
    const store = model.createStore();
    const logger = new duckdb.ConsoleLogger();
    const dbWorker = new Worker(options.workerURL);

    const db = new duckdb.AsyncDuckDB(logger, dbWorker);
    await db.open(duckdb_wasm);
    const conn = await db.connect();

    const ctx: IAppContext = {
        store,
        logger,
        database: db,
        databaseConnection: conn,
    };

    ReactDOM.render(
        <AppContextProvider value={ctx}>
            <ReduxProvider store={store}>
                <AppLauncher>
                    <BrowserRouter>
                        <Switch>
                            <Route exact path="/" component={withNavBar(Explorer)} />
                            <Redirect to="/404" />
                        </Switch>
                    </BrowserRouter>
                </AppLauncher>
            </ReduxProvider>
        </AppContextProvider>,
        element,
    );
}
