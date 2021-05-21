export interface RecommendedFile {
    filename: string;
    url: URL;
}

export interface ScriptMetadata {
    script: URL;
    files: RecommendedFile[];
}

const TPCH_01_PARQUET: RecommendedFile[] = [];

const registerScript = (script: URL, files: RecommendedFile[] = []): ScriptMetadata => ({ script, files });

export const EXAMPLE_SCRIPTS: ScriptMetadata[] = [
    registerScript(new URL('./tpch_schema.sql', import.meta.url)),
    registerScript(new URL('./tpch_import_parquet.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_imported_01.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_02.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_03.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_04.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_05.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_06.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_07.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_08.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_09.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_10.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_11.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_12.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_13.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_14.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_15.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_16.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_17.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_18.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_19.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_20.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_21.sql', import.meta.url)),
    registerScript(new URL('./tpch_imported_22.sql', import.meta.url)),
    registerScript(new URL('./tpch_parquet_01.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_02.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_03.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_04.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_05.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_06.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_07.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_08.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_09.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_10.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_11.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_12.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_13.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_14.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_15.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_16.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_17.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_18.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_19.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_20.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_21.sql', import.meta.url), TPCH_01_PARQUET),
    registerScript(new URL('./tpch_parquet_22.sql', import.meta.url), TPCH_01_PARQUET),
];
