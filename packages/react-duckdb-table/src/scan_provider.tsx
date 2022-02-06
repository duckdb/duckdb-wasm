import * as React from 'react';
import * as arrow from 'apache-arrow';
import * as duckdb from '@kimmolinna/duckdb-wasm';

type RequestScanFn = (request: ScanRequest) => void;

export class ScanRequest {
    /// The offset of a range
    offset = 0;
    /// The limit of a range
    limit = 0;
    /// The overscan
    overscan = 0;

    /// Configure range
    public withRange(offset: number, limit: number, overscan = 0): ScanRequest {
        this.offset = offset;
        this.limit = limit;
        this.overscan = overscan;
        return this;
    }

    /// Get begin of scan range
    get begin(): number {
        return Math.max(this.offset, this.overscan) - this.overscan;
    }
    /// Get end of scan range
    get end(): number {
        return this.offset + this.limit + this.overscan;
    }

    /// Does a scan fully include a given range?
    includesRequest(other: ScanRequest): boolean {
        return this.includesRange(other.offset, other.limit);
    }

    /// Does a scan fully include a given range?
    public includesRange(offset: number, limit: number): boolean {
        if (this.limit == 0 || limit == 0) {
            return this.limit == 0 && this.begin <= offset;
        } else {
            return this.begin <= offset && this.end >= offset + limit;
        }
    }

    /// Does intersect with a range
    public intersectsRange(offset: number, limit: number): boolean {
        if (limit == 0) return true;
        if (this.limit == 0) {
            return offset + limit > this.begin;
        } else {
            const b = this.begin;
            const e = this.end;
            return (
                (offset >= b && offset + limit <= e) ||
                (offset <= b && offset + limit >= b) ||
                (offset < e && offset + limit >= e)
            );
        }
    }
}

export interface ScanResult {
    /// The scan request
    request: ScanRequest;
    /// The query result buffer
    result: arrow.Table;
}

interface Props {
    /// The connection
    connection: duckdb.AsyncDuckDBConnection;
    /// The table name
    table: string;
    /// The request
    request: ScanRequest;
    /// The children
    children: (scanResult: ScanResult, requestScan: RequestScanFn) => JSX.Element;
}

interface State {
    /// The queued query
    queryQueued: ScanRequest | null;
    /// The query Promise
    queryInFlightPromise: Promise<ScanResult> | null;
    /// The in-flight query
    queryInFlight: ScanRequest | null;
    /// The available result
    availableResult: ScanResult | null;
}

export const ScanProvider: React.FC<Props> = (props: Props) => {
    const [state, dispatchState] = React.useState<State>({
        queryQueued: props.request,
        queryInFlightPromise: null,
        queryInFlight: null,
        availableResult: null,
    });

    // Detect unmount
    const isMountedRef = React.useRef(true);
    React.useEffect(() => {
        return () => void (isMountedRef.current = false);
    }, []);

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
            dispatchState(s => ({
                ...s,
                queryQueued: request,
            }));
        },
        [state],
    );

    // Run a query
    const runQuery = React.useCallback(
        async (request: ScanRequest): Promise<ScanResult> => {
            const offset = request.begin;
            const limit = request.end - offset;
            let query = `SELECT * FROM ${props.table}`;
            if (request.offset > 0) {
                query += ` OFFSET ${offset}`;
            }
            if (request.limit > 0) {
                query += ` LIMIT ${limit}`;
            }
            const result = await props.connection.query(query);
            return {
                request,
                result,
            };
        },
        [props.table],
    );

    /// Schedule queued queries
    React.useEffect(() => {
        if (state.queryInFlight || !state.queryQueued) return;

        const inFlight = state.queryQueued;
        const promise = runQuery(inFlight);
        dispatchState(s => ({
            ...s,
            queryQueued: null,
            queryInFlight: inFlight,
            queryInFlightPromise: promise,
        }));

        (async () => {
            try {
                const result = await promise;
                if (!isMountedRef.current) return;
                dispatchState(s => ({
                    ...s,
                    queryInFlight: null,
                    queryInFlightPromise: null,
                    availableResult: result,
                }));
            } catch (e) {
                console.error(e);
            }
        })();
    }, [state.queryInFlight, state.queryQueued]);

    if (!state.availableResult) {
        return <div />;
    }

    return props.children(state.availableResult, requestScan);
};
