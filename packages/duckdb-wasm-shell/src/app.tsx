import * as React from 'react';
import * as ReactDOM from 'react-dom';
//import * as duckdb from '../../duckdb/dist/duckdb.module';
import Shell from './shell';
import { Route, BrowserRouter, Redirect } from 'react-router-dom';
import { withNavBar } from './components/navbar';

import './globals.css';

const PaddedShell = () => <Shell padding={[16, 20]} backgroundColor="#333" />;

const element = document.getElementById('root');
ReactDOM.render(
    <BrowserRouter>
        <Route exact path="/" component={withNavBar(PaddedShell)} />
        <Redirect to="/" />
    </BrowserRouter>,
    element,
);
