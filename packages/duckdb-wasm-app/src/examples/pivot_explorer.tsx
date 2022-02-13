import * as rd from '@duckdb/react-duckdb';
import * as rdt from '@duckdb/react-duckdb-table';
import * as dnd from 'react-dnd';
import React from 'react';

import styles from './pivot_demo.module.css';
import icon_pivot from '../../static/svg/icons/pivot.svg';

const DRAG_ID_TABLE_COLUMN = 'table_column';
const DRAG_ID_COLUMN_GROUP = 'column_group';
const DRAG_ID_ROW_GROUP = 'row_group';
const DRAG_ID_VALUE = 'value';

interface DragItem {
    type: string;
    id: number;
    text: string;
}

interface DropResult {
    type: string;
}

interface PivotModification {
    sourceType: string;
    targetType: string | null;
    id: number;
}

interface PivotItemProps {
    className?: string;
    type: string;
    id: number;
    children?: React.ReactElement | React.ReactElement[] | string;
    modify: (m: PivotModification) => void;
}

function PivotItem(props: PivotItemProps) {
    const [state, dragRef] = dnd.useDrag(
        () => ({
            type: props.type,
            item: () => ({
                id: props.id,
                text: props.children,
            }),
            collect: monitor => ({
                isDragging: monitor.isDragging(),
            }),
            end: (item, monitor) => {
                const result = monitor.getDropResult() as DropResult | null;
                // Dropped somewhere
                if (result != null) {
                    /// Dropped back?
                    if (result.type === props.type) {
                        return;
                    }
                    // Move to other area
                    props.modify({
                        sourceType: props.type,
                        targetType: result.type,
                        id: props.id,
                    });
                } else {
                    // Dragged to nowhere, remove
                    props.modify({
                        sourceType: props.type,
                        targetType: null,
                        id: props.id,
                    });
                }
            },
        }),
        [],
    );
    return (
        <div ref={dragRef} className={props.className} style={{ opacity: state.isDragging ? 0.0 : 1.0 }}>
            {props.children}
        </div>
    );
}

interface PivotItemListProps<ValueType> {
    listClass: string;
    itemClass: string;
    itemType: string;
    values: ValueType[];
    valueRenderer: (value: ValueType) => string;
    modify: (m: PivotModification) => void;
}

function PivotItemList<ValueType>(props: PivotItemListProps<ValueType>) {
    const state = dnd.useDrop(() => ({
        accept: [DRAG_ID_ROW_GROUP, DRAG_ID_TABLE_COLUMN, DRAG_ID_COLUMN_GROUP, DRAG_ID_VALUE],
        drop: (item: DragItem) => {
            return { type: props.itemType };
        },
    }));
    return (
        <div className={props.listClass} ref={state[1]}>
            {props.values.map((v, i) => (
                <PivotItem key={i} id={i} className={props.itemClass} type={props.itemType} modify={props.modify}>
                    {props.valueRenderer(v)}
                </PivotItem>
            ))}
        </div>
    );
}

interface ExplorerProps {
    className?: string;
}

interface PivotConfig {
    groupRowsBy: rdt.PivotRowGrouping[];
    groupColumnsBy: number[];
    aggregates: rdt.PivotAggregate[];
}

export const PivotExplorer: React.FC<ExplorerProps> = (props: ExplorerProps) => {
    const conn = rd.useDuckDBConnection()!;
    const table = rd.useTableSchema();
    const [pivot, _setPivot] = React.useState<PivotConfig>({
        groupRowsBy: [
            {
                expression: 'name',
                alias: 'name',
            },
            {
                expression: `date_trunc('second', last_update)`,
                alias: 'timestamp',
            },
        ],
        groupColumnsBy: [1],
        aggregates: [
            {
                expression: 'ask',
                func: rdt.PivotAggregationFunction.SUM,
                alias: 'ask',
            },
            {
                expression: 'bid',
                func: rdt.PivotAggregationFunction.SUM,
                alias: 'bid',
            },
        ],
    });

    return (
        <div className={styles.pivot_container}>
            <div className={styles.pivot_icon_container}>
                <svg className={styles.pivot_icon} width="24px" height="24px">
                    <use xlinkHref={`${icon_pivot}#sym`} />
                </svg>
            </div>
            <div className={styles.table_column_area}>
                <div className={styles.label_top}>Table</div>
                <PivotItemList<string>
                    listClass={styles.table_column_list}
                    itemClass={styles.table_column}
                    itemType={DRAG_ID_TABLE_COLUMN}
                    values={table?.columnNames || []}
                    valueRenderer={n => n}
                    modify={m => console.log(m)}
                />
            </div>
            <div className={styles.pivot_column_area}>
                <div className={styles.label_top}>Column Groups</div>
                <PivotItemList<number>
                    listClass={styles.pivot_column_list}
                    itemClass={styles.pivot_column}
                    itemType={DRAG_ID_COLUMN_GROUP}
                    values={pivot.groupColumnsBy || []}
                    valueRenderer={i => table?.columnNames[i]?.toString() || ''}
                    modify={m => console.log(m)}
                />
            </div>
            <div className={styles.pivot_row_area}>
                <div className={styles.label_left}>Row Groups</div>
                <PivotItemList<rdt.PivotRowGrouping>
                    listClass={styles.pivot_row_list}
                    itemClass={styles.pivot_row}
                    itemType={DRAG_ID_ROW_GROUP}
                    values={pivot.groupRowsBy || []}
                    valueRenderer={n => n.alias || ''}
                    modify={m => console.log(m)}
                />
            </div>
            <div className={styles.pivot_value_area}>
                <div className={styles.label_left}>Values</div>
                <PivotItemList<rdt.PivotAggregate>
                    listClass={styles.pivot_value_list}
                    itemClass={styles.pivot_value}
                    itemType={DRAG_ID_VALUE}
                    values={pivot.aggregates || []}
                    valueRenderer={n => n.alias || ''}
                    modify={m => console.log(m)}
                />
            </div>
            <div className={styles.pivot_body}>
                {pivot.groupColumnsBy.length == 0 && pivot.groupRowsBy.length == 0 ? (
                    <rdt.WiredTableViewer
                        connection={conn}
                        ordering={[
                            {
                                columnIndex: 0,
                            },
                            {
                                columnIndex: 2,
                                descending: true,
                            },
                        ]}
                    />
                ) : (
                    <rdt.PivotTableProvider
                        name="pivot"
                        connection={conn}
                        table={table}
                        groupRowsBy={pivot.groupRowsBy}
                        groupColumnsBy={pivot.groupColumnsBy}
                        aggregates={pivot.aggregates}
                    >
                        <rdt.WiredTableViewer connection={conn} />
                    </rdt.PivotTableProvider>
                )}
            </div>
        </div>
    );
};
