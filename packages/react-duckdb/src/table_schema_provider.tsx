import * as React from 'react';
import { TableSchema, collectTableSchema } from './table_schema';
import { useTableSchemaEpoch } from './epoch_contexts';
import { useDuckDBConnection } from './connection_provider';

interface Props {
    /// The children
    children: React.ReactElement | React.ReactElement[];
    /// The schema
    schema?: string;
    /// The name
    name: string;
}

interface State {
    /// The schema
    schema: string | null;
    /// The name
    name: string | null;
    /// The metadata
    metadata: TableSchema | null;
    /// The own epoch
    ownEpoch: number | null;
}

export const TABLE_METADATA = React.createContext<TableSchema | null>(null);
export const useTableSchema = (): TableSchema | null => React.useContext(TABLE_METADATA);

export const DuckDBTableSchemaProvider: React.FC<Props> = (props: Props) => {
    const epoch = useTableSchemaEpoch() ?? Number.MIN_SAFE_INTEGER;
    const conn = useDuckDBConnection();
    const [state, setState] = React.useState<State>({
        schema: null,
        name: null,
        ownEpoch: epoch,
        metadata: null,
    });
    const inFlight = React.useRef<boolean>(false);

    // Detect unmount
    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => void (isMounted.current = false);
    }, []);

    // Resolve the metadata
    React.useEffect(() => {
        if (!isMounted.current || !conn || inFlight.current) {
            return;
        }
        inFlight.current = true;
        const resolve = async (schema: string, name: string, epoch: number | null) => {
            const metadata = await collectTableSchema(conn!, {
                tableSchema: schema,
                tableName: name,
            });
            inFlight.current = false;
            if (!isMounted.current) return;
            setState({
                schema,
                name,
                ownEpoch: epoch,
                metadata,
            });
        };
        resolve(props.schema || 'main', props.name, epoch).catch(e => console.error(e));
    }, [conn, props.schema, props.name, epoch]);

    return <TABLE_METADATA.Provider value={state.metadata}>{props.children}</TABLE_METADATA.Provider>;
};
