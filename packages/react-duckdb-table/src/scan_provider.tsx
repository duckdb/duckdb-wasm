import * as React from 'react';
import * as arrow from 'apache-arrow';
import * as rd from '@duckdb/react-duckdb';

export type RequestScanFn = (request: ScanRequest) => void;

export const SCAN_RESULT = React.createContext<ScanResult | null>(null);
export const SCAN_STATISTICS = React.createContext<ScanStatistics | null>(null);
export const SCAN_REQUESTER = React.createContext<RequestScanFn | null>(null);

export interface ScanResult {
    /// The scan request
    request: ScanRequest;
    /// The schema
    table: rd.TableSchema;
    /// The query result buffer
    result: arrow.Table;
}

export interface ScanStatistics {
    /// The number of queries
    queryCount: number;
    /// The total query execution
    queryExecutionTotalMs: number;
    /// The returned result rows
    resultRows: number;
    /// The returned result bytes
    resultBytes: number;
}

export interface OrderSpecification {
    /// The column
    columnIndex: number;
    /// Descending?
    descending?: boolean;
    /// Nulls first?
    nullsFirst?: boolean;
}

export class ScanRequest {
    /// The offset of a range
    offset = 0;
    /// The limit of a range
    limit = 0;
    /// The overscan
    overscan = 0;
    /// The ordering
    ordering: OrderSpecification[] | null = null;

    /// Configure range
    public withRange(offset: number, limit: number, overscan = 0): ScanRequest {
        this.offset = offset;
        this.limit = limit;
        this.overscan = overscan;
        return this;
    }

    public withOrdering(ordering: OrderSpecification[] | null): ScanRequest {
        this.ordering = ordering;
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

    /// Has same ordering?
    sameOrdering(other: ScanRequest): boolean {
        if (this.ordering == other.ordering) {
            return true;
        }
        const l = this.ordering;
        const r = other.ordering;
        if (l != null && r != null && l.length == r.length) {
            for (let i = 0; i < l.length; ++i) {
                for (let j = 0; j < r.length; ++j) {
                    const eq =
                        l[i].columnIndex == r[i].columnIndex &&
                        l[i].descending == r[i].descending &&
                        l[i].nullsFirst == r[i].nullsFirst;
                    if (!eq) return false;
                }
            }
        }
        return true;
    }

    /// Does a scan fully include a given range?
    includesRequest(other: ScanRequest): boolean {
        return this.includesRange(other.offset, other.limit) && this.sameOrdering(other);
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
