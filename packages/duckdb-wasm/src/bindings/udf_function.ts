import * as arrow from 'apache-arrow';

export interface UDFFunctionDeclaration {
    functionId?: number;
    name: string;
    returnType: arrow.DataType;
    argumentCount: arrow.DataType[];
}

export interface UDFFunction {
    connection_id: number;
    name: string;
    func: (...args: any[]) => any;
}
