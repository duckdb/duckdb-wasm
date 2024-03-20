import { SQLType } from '../json_typedef';
import * as arrow from 'apache-arrow';
export interface UDFFunctionDeclaration {
    functionId: number;
    name: string;
    returnType: SQLType;
}
export interface UDFFunction {
    functionId: number;
    connectionId: number;
    name: string;
    returnType: arrow.DataType;
    func: (...args: any[]) => any;
}
