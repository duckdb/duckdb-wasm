import * as React from 'react';
import * as ReactDOM from 'react-dom';
//import * as duckdb from '../../duckdb/dist/duckdb.module';
import Shell from './shell';

import './globals.css';

const element = document.getElementById('root');
ReactDOM.render(<Shell padding={[12]} borderRadius={[0]} backgroundColor="black" />, element);
