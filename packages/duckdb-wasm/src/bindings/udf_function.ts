import { FlatArrowType } from '../flat_arrow';
import * as arrow from 'apache-arrow';

export interface UDFFunctionDeclaration {
    functionId: number;
    name: string;
    returnType: FlatArrowType;
}

export interface UDFFunction {
    functionId: number;
    connectionId: number;
    name: string;
    returnType: arrow.DataType;
    func: (...args: any[]) => any;
}
