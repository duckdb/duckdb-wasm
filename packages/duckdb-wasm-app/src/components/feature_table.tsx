import React from 'react';
import cn from 'classnames';
import { usePopperTooltip } from 'react-popper-tooltip';

import styles from './feature_table.module.css';

import icon_close from '../../static/svg/icons/close.svg';
import icon_check from '../../static/svg/icons/check.svg';

enum FeatureID {
    LANGUAGE = 1,
    LICENSE = 2,
    BUNDLE_SIZE = 15,

    QUERY_INPUT = 3,
    WORKER_OFFLOADING = 4,

    CSV_IMPORT = 5,
    JSON_IMPORT = 6,
    ARROW_IMPORT = 7,
    PARQUET_IMPORT = 8,

    EVALUATION_STRATEGY = 9,
    NATIVE_COLUMN_ARRAYS = 10,
    LOCAL_FILE_ACCESS = 11,
    REMOTE_FILE_ACCESS = 12,
    PARTIAL_FILE_READING = 13,
}

interface FeatureValue {
    text?: string;
    available?: boolean;
    restrictions?: string[];
}

const DUCKDB_FEATURES = new Map<FeatureID, FeatureValue>([
    [FeatureID.LANGUAGE, { text: 'C++ & TS' }],
    [FeatureID.LICENSE, { text: 'MIT' }],
    [FeatureID.BUNDLE_SIZE, { text: '67 KB + 2.5 MB', restrictions: ['Streaming Wasm compilation'] }],
    [FeatureID.EVALUATION_STRATEGY, { text: 'Vector at a time' }],
    [FeatureID.QUERY_INPUT, { text: 'SQL Text' }],
    [FeatureID.WORKER_OFFLOADING, { available: true }],
    [FeatureID.CSV_IMPORT, { available: true }],
    [FeatureID.JSON_IMPORT, { available: true }],
    [FeatureID.PARQUET_IMPORT, { available: true }],
    [FeatureID.ARROW_IMPORT, { available: true }],
    [FeatureID.NATIVE_COLUMN_ARRAYS, { available: true }],
    [FeatureID.LOCAL_FILE_ACCESS, { available: true }],
    [FeatureID.REMOTE_FILE_ACCESS, { available: true }],
    [FeatureID.PARTIAL_FILE_READING, { available: true }],
]);

const SQLJS_FEATURES = new Map<FeatureID, FeatureValue>([
    [FeatureID.LANGUAGE, { text: 'C & JS' }],
    [FeatureID.LICENSE, { text: 'MIT' }],
    [FeatureID.BUNDLE_SIZE, { text: '15 KB + 332 KB', restrictions: ['Streaming Wasm compilation'] }],
    [FeatureID.EVALUATION_STRATEGY, { text: 'Tuple at a time' }],
    [FeatureID.QUERY_INPUT, { text: 'SQL Text' }],
    [FeatureID.WORKER_OFFLOADING, { available: true, restrictions: ['Manual message passing'] }],
    [FeatureID.CSV_IMPORT, { available: false }],
    [FeatureID.JSON_IMPORT, { available: false }],
    [FeatureID.PARQUET_IMPORT, { available: false }],
    [FeatureID.ARROW_IMPORT, { available: false }],
    [FeatureID.NATIVE_COLUMN_ARRAYS, { available: false }],
    [FeatureID.LOCAL_FILE_ACCESS, { available: false }],
    [FeatureID.REMOTE_FILE_ACCESS, { available: false, restrictions: ['phiresky/sql.js-httpvfs'] }],
    [FeatureID.PARTIAL_FILE_READING, { available: false, restrictions: ['phiresky/sql.js-httpvfs'] }],
]);

const ARQUERO_FEATURES = new Map<FeatureID, FeatureValue>([
    [FeatureID.LANGUAGE, { text: 'JS' }],
    [FeatureID.LICENSE, { text: 'BSD-3' }],
    [FeatureID.BUNDLE_SIZE, { text: '67 KB' }],
    [FeatureID.EVALUATION_STRATEGY, { text: 'Full Materialization' }],
    [FeatureID.QUERY_INPUT, { text: 'Query Builder' }],
    [FeatureID.WORKER_OFFLOADING, { available: true }],
    [FeatureID.CSV_IMPORT, { available: true }],
    [FeatureID.JSON_IMPORT, { available: true }],
    [FeatureID.PARQUET_IMPORT, { available: false }],
    [FeatureID.ARROW_IMPORT, { available: true }],
    [FeatureID.NATIVE_COLUMN_ARRAYS, { available: true }],
    [FeatureID.LOCAL_FILE_ACCESS, { available: false }],
    [FeatureID.REMOTE_FILE_ACCESS, { available: false }],
    [FeatureID.PARTIAL_FILE_READING, { available: false }],
]);

const LOVEFIELD_FEATURES = new Map<FeatureID, FeatureValue>([
    [FeatureID.LANGUAGE, { text: 'JS' }],
    [FeatureID.LICENSE, { text: 'Apache-2' }],
    [FeatureID.BUNDLE_SIZE, { text: '37 KB' }],
    [FeatureID.EVALUATION_STRATEGY, { text: 'Full Materialization' }],
    [FeatureID.QUERY_INPUT, { text: 'Query Builder' }],
    [FeatureID.WORKER_OFFLOADING, { available: false }],
    [FeatureID.CSV_IMPORT, { available: false }],
    [FeatureID.JSON_IMPORT, { available: false }],
    [FeatureID.PARQUET_IMPORT, { available: false }],
    [FeatureID.ARROW_IMPORT, { available: false }],
    [FeatureID.NATIVE_COLUMN_ARRAYS, { available: false }],
    [FeatureID.LOCAL_FILE_ACCESS, { available: false }],
    [FeatureID.REMOTE_FILE_ACCESS, { available: false }],
    [FeatureID.PARTIAL_FILE_READING, { available: false }],
]);

interface TableEntryProps {
    value: FeatureValue;
}

const FeatureTableEntry: React.FC<TableEntryProps> = (props: TableEntryProps) => {
    const { getArrowProps, getTooltipProps, setTooltipRef, setTriggerRef, visible } = usePopperTooltip();
    return (
        <>
            <div className={styles.table_entry} ref={setTriggerRef}>
                {props.value.available !== undefined &&
                    (props.value.available ? (
                        <svg width="18px" height="18px">
                            <use xlinkHref={`${icon_check}#sym`} />
                        </svg>
                    ) : (
                        <svg width="18px" height="18px">
                            <use xlinkHref={`${icon_close}#sym`} />
                        </svg>
                    ))}
                {props.value.text}
                {props.value.restrictions ? ' *' : ''}
            </div>
            {props.value.restrictions && visible && (
                <div ref={setTooltipRef} {...getTooltipProps({ className: 'tooltip-container' })}>
                    <div {...getArrowProps({ className: 'tooltip-arrow' })} />
                    {props.value.restrictions}
                </div>
            )}
        </>
    );
};

interface TableRowProps {
    className?: string;
    feature: FeatureID;
    name: string;
}

const FeatureTableRow: React.FC<TableRowProps> = (props: TableRowProps) => (
    <>
        <div className={styles.table_row_header}>{props.name}</div>
        <FeatureTableEntry value={DUCKDB_FEATURES.get(props.feature)!} />
        <FeatureTableEntry value={SQLJS_FEATURES.get(props.feature)!} />
        <FeatureTableEntry value={ARQUERO_FEATURES.get(props.feature)!} />
        <FeatureTableEntry value={LOVEFIELD_FEATURES.get(props.feature)!} />
    </>
);

interface TableProps {
    className?: string;
}

export const FeatureTable: React.FC<TableProps> = (props: TableProps) => {
    return (
        <div className={cn(styles.table_container, props.className)}>
            <div className={styles.table}>
                <div className={styles.table_title}>Features</div>

                <div className={styles.table_anchor} />
                <div className={styles.table_column_header}>DuckDB-Wasm</div>
                <div className={styles.table_column_header}>sql.js</div>
                <div className={styles.table_column_header}>Arquero</div>
                <div className={styles.table_column_header}>Lovefield</div>

                <FeatureTableRow feature={FeatureID.LANGUAGE} name="Language" />
                <FeatureTableRow feature={FeatureID.LICENSE} name="License" />
                <FeatureTableRow feature={FeatureID.BUNDLE_SIZE} name="Compressed Size" />
                <FeatureTableRow feature={FeatureID.EVALUATION_STRATEGY} name="Evaluation Strategy" />
                <FeatureTableRow feature={FeatureID.QUERY_INPUT} name="Query Input" />
                <FeatureTableRow feature={FeatureID.WORKER_OFFLOADING} name="Worker Offloading" />
                <FeatureTableRow feature={FeatureID.CSV_IMPORT} name="Raw CSV Import" />
                <FeatureTableRow feature={FeatureID.JSON_IMPORT} name="Raw JSON Import" />
                <FeatureTableRow feature={FeatureID.ARROW_IMPORT} name="Raw Arrow Import" />
                <FeatureTableRow feature={FeatureID.PARQUET_IMPORT} name="Raw Parquet Import" />
                <FeatureTableRow feature={FeatureID.LOCAL_FILE_ACCESS} name="Local File Access" />
                <FeatureTableRow feature={FeatureID.REMOTE_FILE_ACCESS} name="Remote File Access" />
                <FeatureTableRow feature={FeatureID.PARTIAL_FILE_READING} name="Partial File Reads" />
            </div>
        </div>
    );
};
