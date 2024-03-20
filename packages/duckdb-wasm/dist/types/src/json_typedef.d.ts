import * as arrow from 'apache-arrow';
export interface SQLType {
    sqlType: string;
    nullable?: boolean;
    precision?: number;
    scale?: number;
    timezone?: string;
    byteWidth?: number;
    keyType?: SQLType;
    valueType?: SQLType;
    fields?: SQLField[];
}
export declare function arrowToSQLType(type: arrow.DataType): SQLType;
export type SQLField = SQLType & {
    name: string;
};
export declare function arrowToSQLField(name: string, type: arrow.DataType): SQLField;
