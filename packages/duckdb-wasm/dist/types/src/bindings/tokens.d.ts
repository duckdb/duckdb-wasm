export declare enum TokenType {
    IDENTIFIER = 0,
    NUMERIC_CONSTANT = 1,
    STRING_CONSTANT = 2,
    OPERATOR = 3,
    KEYWORD = 4,
    COMMENT = 5
}
export interface ScriptTokens {
    offsets: number[];
    types: TokenType[];
}
