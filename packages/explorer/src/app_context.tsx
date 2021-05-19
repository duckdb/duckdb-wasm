import * as React from 'react';
import * as model from './model';
import * as duckdb from '../../duckdb/dist/duckdb.module';

export interface IAppContext {
    store: model.AppReduxStore;
    logger: duckdb.Logger;

    // TODO abstract
    db: duckdb.AsyncDuckDB;
    dbConnection: duckdb.AsyncDuckDBConnection;
}

const ctx = React.createContext<IAppContext | null>(null);
export const AppContextProvider = ctx.Provider;
export const AppContextConsumer = ctx.Consumer;

export function withAppContext<
    ALL_PROPS extends { ctx?: IAppContext },
    RAW_PROPS = Pick<ALL_PROPS, Exclude<keyof ALL_PROPS, 'ctx'>>,
>(Component: React.ComponentClass<ALL_PROPS> | React.FunctionComponent<ALL_PROPS>): React.FunctionComponent<RAW_PROPS> {
    // eslint-disable-next-line react/display-name
    return (props: RAW_PROPS) => {
        return (
            <AppContextConsumer>
                {value => <Component {...Object.assign({} as ALL_PROPS, props, { ctx: value })} />}
            </AppContextConsumer>
        );
    };
}
