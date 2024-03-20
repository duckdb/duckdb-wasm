import * as arrow from 'apache-arrow';
import { SQLField } from '../json_typedef';
export declare enum JSONTableShape {
    ROW_ARRAY = "row-array",
    COLUMN_OBJECT = "column-object"
}
export interface JSONInsertOptions {
    name: string;
    schema?: string;
    create?: boolean;
    shape?: JSONTableShape;
    columns?: {
        [key: string]: arrow.DataType;
    };
    columnsFlat?: SQLField[];
}
export interface CSVInsertOptions {
    name: string;
    schema?: string;
    create?: boolean;
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
    columnsFlat?: SQLField[];
}
export interface ArrowInsertOptions {
    name: string;
    schema?: string;
    create?: boolean;
}
