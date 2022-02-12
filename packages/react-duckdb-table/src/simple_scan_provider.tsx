import * as React from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { SCAN_REQUESTER, SCAN_RESULT, SCAN_STATISTICS, ScanRequest, ScanStatistics, ScanResult } from './scan_provider';
import { TableSchema, getQualifiedName, useTableDataEpoch } from '@duckdb/react-duckdb';

interface Props {
    /// The connection
    connection: duckdb.AsyncDuckDBConnection;
    /// The table
    table: TableSchema;
    /// The request
    request: ScanRequest;
    /// The children
    children: React.ReactElement[] | React.ReactElement;
}

interface State {
    /// The statistics
    statistics: ScanStatistics;
    /// The queued query
    queryQueued: ScanRequest | null;
    /// The query Promise
    queryInFlightPromise: Promise<ScanResult & { duration: number }> | null;
    /// The in-flight query
    queryInFlight: ScanRequest | null;
    /// The available result
    availableResult: ScanResult | null;
}

export const SimpleScanProvider: React.FC<Props> = (props: Props) => {
    const epoch = useTableDataEpoch();
    const [state, setState] = React.useState<State>({
        statistics: {
            queryCount: 0,
            queryExecutionTotalMs: 0,
            resultRows: 0,
            resultBytes: 0,
        },
        queryQueued: props.request,
        queryInFlightPromise: null,
        queryInFlight: null,
        availableResult: null,
    });

    // Detect unmount
    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => void (isMounted.current = false);
    }, []);

    // Replay on epoch change
    React.useEffect(() => {
        // Queued query will pick up thye result?
        if (state.queryQueued != null) {
            return;
        }
        // Scan in flight that misses the epoch?
        else if (state.queryInFlight != null) {
            setState(s => ({
                ...s,
                queryQueued: state.queryInFlight,
            }));
        }
        // Available result that needs a refresh?
        else if (state.availableResult != null) {
            setState(s => ({
                ...s,
                queryQueued: state.availableResult!.request,
            }));
        }
    }, [epoch]);

    // Request a scan
    const requestScan = React.useCallback(
        (request: ScanRequest) => {
            // Nothing to do?
            if (
                (state.availableResult && state.availableResult.request.includesRequest(request)) ||
                (state.queryInFlight && state.queryInFlight.includesRequest(request))
            ) {
                return;
            }

            // Replace the queued query
            setState(s => ({
                ...s,
                queryQueued: request,
            }));
        },
        [state],
    );

    // Run a query
    const runQuery = React.useCallback(
        async (request: ScanRequest): Promise<ScanResult & { duration: number }> => {
            const offset = request.begin;
            const limit = request.end - offset;
            let query = `SELECT * FROM ${getQualifiedName(props.table)}`;
            if (request.ordering != null && request.ordering.length > 0) {
                const clauses = request.ordering.map(o => {
                    let buffer = props.table.columnNames[o.columnIndex];
                    if (o.descending) {
                        buffer += ' DESC';
                    }
                    if (o.nullsFirst) {
                        buffer += ' NULLS FIRST';
                    }
                    return buffer;
                });
                query += ` ORDER BY ${clauses.join(',')}`;
            }
            if (request.offset > 0) {
                query += ` OFFSET ${offset}`;
            }
            if (request.limit > 0) {
                query += ` LIMIT ${limit}`;
            }
            const before = performance.now();
            const result = await props.connection.query(query);
            const duration = performance.now() - before;
            return {
                request,
                result,
                duration,
            };
        },
        [props.table],
    );

    // Schedule queued queries
    React.useEffect(() => {
        if (state.queryInFlight || !state.queryQueued) return;
        const inFlight = state.queryQueued;
        const promise = runQuery(inFlight);
        setState(s => ({
            ...s,
            queryQueued: null,
            queryInFlight: inFlight,
            queryInFlightPromise: promise,
        }));
    }, [state.queryInFlight, state.queryQueued]);

    // Wait for the query results
    React.useEffect(() => {
        (async () => {
            if (!state.queryInFlightPromise) {
                return;
            }
            const res = await state.queryInFlightPromise;
            if (!res || !isMounted.current) return;
            let bytes = 0;
            for (const batch of res.result.batches) {
                for (let i = 0; i < batch.numCols; ++i) {
                    bytes += batch.getByteLength(i);
                }
            }
            setState(s => ({
                ...s,
                statistics: {
                    queryCount: s.statistics.queryCount + 1,
                    queryExecutionTotalMs: s.statistics.queryExecutionTotalMs + res.duration,
                    resultRows: s.statistics.resultRows + res.result.numRows,
                    resultBytes: s.statistics.resultBytes + bytes,
                },
                queryInFlight: null,
                queryInFlightPromise: null,
                availableResult: res,
            }));
        })().catch(e => console.error(e));
    }, [state.queryInFlightPromise]);

    if (!state.availableResult) {
        return <div />;
    }

    return (
        <SCAN_REQUESTER.Provider value={requestScan}>
            <SCAN_RESULT.Provider value={state.availableResult}>
                <SCAN_STATISTICS.Provider value={state.statistics}>{props.children}</SCAN_STATISTICS.Provider>
            </SCAN_RESULT.Provider>
        </SCAN_REQUESTER.Provider>
    );
};
