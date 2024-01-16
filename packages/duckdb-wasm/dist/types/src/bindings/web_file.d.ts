import { DuckDBDataProtocol } from './runtime';
export interface WebFile {
    fileName: string;
    dataProtocol: DuckDBDataProtocol;
    fileId?: number;
    fileSize?: number;
    dataUrl?: string;
    dataNativeFd?: number;
    collectStatistics?: boolean;
    allowFullHttpReads?: boolean;
}
