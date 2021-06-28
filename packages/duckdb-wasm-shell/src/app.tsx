import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as model from './model';
import { Provider as ReduxProvider } from 'react-redux';
import Shell from './shell';
import { Route, BrowserRouter, Redirect } from 'react-router-dom';
import { withNavBar } from './components/navbar';

import '../static/fonts/fonts.module.css';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const PaddedShell = () => <Shell padding={[16, 0, 16, 20]} backgroundColor="#333" />;

const store = model.createStore();

const element = document.getElementById('root');
ReactDOM.render(
    <ReduxProvider store={store}>
        <BrowserRouter>
            <Route exact path="/" component={withNavBar(PaddedShell)} />
            <Redirect to="/" />
        </BrowserRouter>
    </ReduxProvider>,
    element,
);
