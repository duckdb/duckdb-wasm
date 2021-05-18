import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as model from './model';
import Explorer from './explorer';
import { Provider as ReduxProvider } from 'react-redux';
import { AppContextProvider, IAppContext } from './app_context';
import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import { withNavBar } from './components';

import './vars.module.css';

export interface EmbedOptions {
    /// The URL of the DuckDB worker script
    workerURL: string;
    /// Render with navigation bar?
    withNavbar: boolean;
}

const store = model.createStore();
const ctx: IAppContext = {
    store,
};

export function embed(element: Element, options?: EmbedOptions): void {
    ReactDOM.render(
        <AppContextProvider value={ctx}>
            <ReduxProvider store={store}>
                <BrowserRouter>
                    <Switch>
                        <Route exact path="/" component={withNavBar(Explorer)} />
                        <Redirect to="/404" />
                    </Switch>
                </BrowserRouter>
            </ReduxProvider>
        </AppContextProvider>,
        element,
    );
}
