export enum DataProtocol {
    BUFFER = 0,
    NATIVE = 1,
    HTTP = 2,
}

export interface WebFile {
    fileName: string;
    dataProtocol: DataProtocol;
    fileId?: number;
    fileSize?: number;
    dataUrl?: string;
    dataNativeFd?: number;
    allowFullHttpReads?: boolean;
}
