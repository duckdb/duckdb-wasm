import { FlatArrowType } from '../flat_arrow';

export interface UDFFunctionDeclaration {
    functionId: number;
    name: string;
    returnType: FlatArrowType;
}

export interface UDFFunction {
    functionId: number;
    connectionId: number;
    name: string;
    func: (...args: any[]) => any;
}
