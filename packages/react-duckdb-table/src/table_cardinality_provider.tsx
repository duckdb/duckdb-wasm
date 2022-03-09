import * as React from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { TableSchema } from './table_schema';
import { useTableDataEpoch } from './epoch_contexts';
import { getQualifiedName } from './table_schema';
import { TABLE_DATA_EPOCH } from './epoch_contexts';

export const TABLE_CARDINALITY = React.createContext<number | null>(null);

interface Props {
    /// The connection
    connection: duckdb.AsyncDuckDBConnection;
    /// The table
    table: TableSchema;
    /// The children
    children: React.ReactElement[] | React.ReactElement;
}

interface State {
    /// The own epoch
    ownEpoch: number | null;
    /// The cardinality
    cardinality: number | null;
}

export const TableCardinalityProvider: React.FC<Props> = (props: Props) => {
    const [state, setState] = React.useState<State>({
        ownEpoch: null,
        cardinality: null,
    });
    const dataEpoch = useTableDataEpoch() ?? Number.MIN_SAFE_INTEGER;
    const inFlight = React.useRef<boolean>(false);

    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => void (isMounted.current = false);
    }, []);

    const updateCardinality = async (e: number | null) => {
        const result = await props.connection!.query(`SELECT COUNT(*)::INTEGER FROM ${getQualifiedName(props.table)}`);
        const cardinality = result.getChildAt(0)?.get(0) || null;
        if (!isMounted.current) return;

        inFlight.current = false;
        setState({
            ownEpoch: e,
            cardinality,
        });
    };

    React.useEffect(() => {
        if (!props.connection || inFlight.current) {
            return;
        }
        if (state.ownEpoch != dataEpoch) {
            inFlight.current = true;
            updateCardinality(dataEpoch).catch(e => console.error(e));
        }
    }, [props.connection, props.table, dataEpoch, state]);

    return (
        <TABLE_DATA_EPOCH.Provider value={state.ownEpoch}>
            <TABLE_CARDINALITY.Provider value={state.cardinality}>{props.children}</TABLE_CARDINALITY.Provider>
        </TABLE_DATA_EPOCH.Provider>
    );
};
