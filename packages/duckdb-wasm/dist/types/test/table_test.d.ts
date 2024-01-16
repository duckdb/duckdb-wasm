import * as arrow from 'apache-arrow';
export interface Column {
    name: string;
    values: any[];
}
export declare function compareTable(table: arrow.Table, expected: Column[]): void;
