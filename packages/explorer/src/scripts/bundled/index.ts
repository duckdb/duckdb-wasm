export interface RecommendedFile {
    filename: string;
    url: URL;
}

export interface ScriptMetadata {
    script: URL;
    files: RecommendedFile[];
}

export const EXAMPLE_SCRIPTS: ScriptMetadata[] = [
    {
        script: new URL('./tpch_01.sql', import.meta.url),
        files: [],
    },
];
