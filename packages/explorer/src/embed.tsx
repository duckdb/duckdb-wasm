import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as model from './model';
import * as duckdb from '../../duckdb/dist/duckdb.module';
import Explorer from './explorer';
import AppLauncher from './app_launcher';
import { launchApp } from './app_launcher';
import { Provider as ReduxProvider } from 'react-redux';
import { AppContextProvider, IAppContext } from './app_context';
import { Route, BrowserRouter, Switch, Redirect, SwitchProps } from 'react-router-dom';
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

const Routes = (props: SwitchProps) => (
    <Switch>
        <Route exact path={props.location?.pathname} component={withNavBar(Explorer)} />
        <Redirect to={`${props.location?.pathname}`} />
    </Switch>
);

export async function embed(element: Element, options: EmbedOptions): Promise<void> {
    const store = model.createStore();
    const state = store.getState();
    state.config.workerURL = options.workerURL;

    const logger = new duckdb.ConsoleLogger();
    const ctx: IAppContext = {
        store,
        logger,
        database: null,
        databaseConnection: null,
    };
    await launchApp(ctx);

    ReactDOM.render(
        <AppContextProvider value={ctx}>
            <ReduxProvider store={store}>
                <AppLauncher>
                    <BrowserRouter>
                        <Routes />
                    </BrowserRouter>
                </AppLauncher>
            </ReduxProvider>
        </AppContextProvider>,
        element,
    );
}
