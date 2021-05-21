import script_tpch_schema from './tpch_schema.sql';
import script_tpch_import_parquet from './tpch_import_parquet.sql';
import script_tpch_import_tbl from './tpch_import_tbl.sql';
import script_tpch_imported_01 from './tpch_imported_01.sql';
import script_tpch_imported_02 from './tpch_imported_02.sql';
import script_tpch_imported_03 from './tpch_imported_03.sql';
import script_tpch_imported_04 from './tpch_imported_04.sql';
import script_tpch_imported_05 from './tpch_imported_05.sql';
import script_tpch_imported_06 from './tpch_imported_06.sql';
import script_tpch_imported_07 from './tpch_imported_07.sql';
import script_tpch_imported_08 from './tpch_imported_08.sql';
import script_tpch_imported_09 from './tpch_imported_09.sql';
import script_tpch_imported_10 from './tpch_imported_10.sql';
import script_tpch_imported_11 from './tpch_imported_11.sql';
import script_tpch_imported_12 from './tpch_imported_12.sql';
import script_tpch_imported_13 from './tpch_imported_13.sql';
import script_tpch_imported_14 from './tpch_imported_14.sql';
import script_tpch_imported_15 from './tpch_imported_15.sql';
import script_tpch_imported_16 from './tpch_imported_16.sql';
import script_tpch_imported_17 from './tpch_imported_17.sql';
import script_tpch_imported_18 from './tpch_imported_18.sql';
import script_tpch_imported_19 from './tpch_imported_19.sql';
import script_tpch_imported_20 from './tpch_imported_20.sql';
import script_tpch_imported_21 from './tpch_imported_21.sql';
import script_tpch_imported_22 from './tpch_imported_22.sql';
import script_tpch_parquet_01 from './tpch_parquet_01.sql';
import script_tpch_parquet_02 from './tpch_parquet_02.sql';
import script_tpch_parquet_03 from './tpch_parquet_03.sql';
import script_tpch_parquet_04 from './tpch_parquet_04.sql';
import script_tpch_parquet_05 from './tpch_parquet_05.sql';
import script_tpch_parquet_06 from './tpch_parquet_06.sql';
import script_tpch_parquet_07 from './tpch_parquet_07.sql';
import script_tpch_parquet_08 from './tpch_parquet_08.sql';
import script_tpch_parquet_09 from './tpch_parquet_09.sql';
import script_tpch_parquet_10 from './tpch_parquet_10.sql';
import script_tpch_parquet_11 from './tpch_parquet_11.sql';
import script_tpch_parquet_12 from './tpch_parquet_12.sql';
import script_tpch_parquet_13 from './tpch_parquet_13.sql';
import script_tpch_parquet_14 from './tpch_parquet_14.sql';
import script_tpch_parquet_15 from './tpch_parquet_15.sql';
import script_tpch_parquet_16 from './tpch_parquet_16.sql';
import script_tpch_parquet_17 from './tpch_parquet_17.sql';
import script_tpch_parquet_18 from './tpch_parquet_18.sql';
import script_tpch_parquet_19 from './tpch_parquet_19.sql';
import script_tpch_parquet_20 from './tpch_parquet_20.sql';
import script_tpch_parquet_21 from './tpch_parquet_21.sql';
import script_tpch_parquet_22 from './tpch_parquet_22.sql';

export interface RequiredFile {
    filename: string;
    url: URL;
}

export interface ScriptMetadata {
    name: string;
    script: string;
    files: RequiredFile[];
}

const registerScript = (name: string, script: string, files: RequiredFile[] = []): [string, ScriptMetadata] => [
    name,
    {
        name,
        script,
        files,
    },
];

export const SCRIPTS: Map<string, ScriptMetadata> = new Map([
    registerScript('tpch_schema.sql', script_tpch_schema),
    registerScript('tpch_import_parquet.sql', script_tpch_import_parquet),
    registerScript('tpch_import_tbl.sql', script_tpch_import_tbl),
    registerScript('tpch_imported_01.sql', script_tpch_imported_01),
    registerScript('tpch_imported_02.sql', script_tpch_imported_02),
    registerScript('tpch_imported_03.sql', script_tpch_imported_03),
    registerScript('tpch_imported_04.sql', script_tpch_imported_04),
    registerScript('tpch_imported_05.sql', script_tpch_imported_05),
    registerScript('tpch_imported_06.sql', script_tpch_imported_06),
    registerScript('tpch_imported_07.sql', script_tpch_imported_07),
    registerScript('tpch_imported_08.sql', script_tpch_imported_08),
    registerScript('tpch_imported_09.sql', script_tpch_imported_09),
    registerScript('tpch_imported_10.sql', script_tpch_imported_10),
    registerScript('tpch_imported_11.sql', script_tpch_imported_11),
    registerScript('tpch_imported_12.sql', script_tpch_imported_12),
    registerScript('tpch_imported_13.sql', script_tpch_imported_13),
    registerScript('tpch_imported_14.sql', script_tpch_imported_14),
    registerScript('tpch_imported_15.sql', script_tpch_imported_15),
    registerScript('tpch_imported_16.sql', script_tpch_imported_16),
    registerScript('tpch_imported_17.sql', script_tpch_imported_17),
    registerScript('tpch_imported_18.sql', script_tpch_imported_18),
    registerScript('tpch_imported_19.sql', script_tpch_imported_19),
    registerScript('tpch_imported_20.sql', script_tpch_imported_20),
    registerScript('tpch_imported_21.sql', script_tpch_imported_21),
    registerScript('tpch_imported_22.sql', script_tpch_imported_22),
    registerScript('tpch_parquet_01.sql', script_tpch_parquet_01),
    registerScript('tpch_parquet_02.sql', script_tpch_parquet_02),
    registerScript('tpch_parquet_03.sql', script_tpch_parquet_03),
    registerScript('tpch_parquet_04.sql', script_tpch_parquet_04),
    registerScript('tpch_parquet_05.sql', script_tpch_parquet_05),
    registerScript('tpch_parquet_06.sql', script_tpch_parquet_06),
    registerScript('tpch_parquet_07.sql', script_tpch_parquet_07),
    registerScript('tpch_parquet_08.sql', script_tpch_parquet_08),
    registerScript('tpch_parquet_09.sql', script_tpch_parquet_09),
    registerScript('tpch_parquet_10.sql', script_tpch_parquet_10),
    registerScript('tpch_parquet_11.sql', script_tpch_parquet_11),
    registerScript('tpch_parquet_12.sql', script_tpch_parquet_12),
    registerScript('tpch_parquet_13.sql', script_tpch_parquet_13),
    registerScript('tpch_parquet_14.sql', script_tpch_parquet_14),
    registerScript('tpch_parquet_15.sql', script_tpch_parquet_15),
    registerScript('tpch_parquet_16.sql', script_tpch_parquet_16),
    registerScript('tpch_parquet_17.sql', script_tpch_parquet_17),
    registerScript('tpch_parquet_18.sql', script_tpch_parquet_18),
    registerScript('tpch_parquet_19.sql', script_tpch_parquet_19),
    registerScript('tpch_parquet_20.sql', script_tpch_parquet_20),
    registerScript('tpch_parquet_21.sql', script_tpch_parquet_21),
    registerScript('tpch_parquet_22.sql', script_tpch_parquet_22),
]);
