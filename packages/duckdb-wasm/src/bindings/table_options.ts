import * as arrow from 'apache-arrow';
import { FlatArrowField } from '../flat_arrow';

export enum JSONTableFormat {
    ROW_ARRAY = 'row-array',
    COLUMN_OBJECT = 'column-object',
}

export interface JSONTableOptions {
    name: string;
    schema?: string;
    format?: JSONTableFormat;
    columns?: {
        [key: string]: arrow.DataType;
    };
    columnsFlat?: FlatArrowField[];
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
    dateFormat?: string;
    timestampFormat?: string;
    columns?: {
        [key: string]: arrow.DataType;
    };
    columnsFlat?: FlatArrowField[];
}
