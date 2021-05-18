/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import { AppState } from './state';
import { Store } from 'redux';

export * from './state_mutation';
export * from './state';

// The store type
export type AppReduxStore = Store<AppState>;

/// Create the store with respect to the environment
export let createStore: () => AppReduxStore;
if (process.env.NODE_ENV === 'production') {
    createStore = require('./store_prod').default;
} else {
    createStore = require('./store_dev').default;
}
