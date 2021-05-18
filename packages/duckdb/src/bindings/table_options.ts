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
}
