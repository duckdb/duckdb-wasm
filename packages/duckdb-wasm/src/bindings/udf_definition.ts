import * as arrow from 'apache-arrow';

export interface UDFFunctionDefinition {
    name: string;
    returnType: arrow.DataType;
    argumentTypes: arrow.DataType[];
    code: string;
}
