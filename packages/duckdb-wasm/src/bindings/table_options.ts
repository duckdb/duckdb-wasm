import * as arrow from 'apache-arrow';

export enum JSONTableFormat {
    ROW_ARRAY = 'row-array',
    COLUMN_OBJECT = 'column-object',
}

export interface JSONTableOptions {
    name: string;
    schema?: string;
    format?: JSONTableFormat;
}

export interface CSVTableOptions {
    name: string;
    schema?: string;
    header?: boolean;
    delimiter?: string;
    quote?: string;
    escape?: string;
    skip?: number;
    detect?: boolean;
    columns?: {
        [key: string]: arrow.DataType;
    };
    columnsFlat?: { name: string; type: string }[];
}
