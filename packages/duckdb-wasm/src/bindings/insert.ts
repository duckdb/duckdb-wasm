export enum InsertMode {
    APPEND,
    IMPORT,
}

export interface InsertOptions {
    mode: InsertMode;
}
