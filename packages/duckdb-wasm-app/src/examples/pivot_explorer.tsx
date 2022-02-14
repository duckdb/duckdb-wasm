import * as rd from '@duckdb/react-duckdb';
import * as rdt from '@duckdb/react-duckdb-table';
import * as dnd from 'react-dnd';
import * as imm from 'immutable';
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
    const [, dragRef] = dnd.useDrag(
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
        <div ref={dragRef} className={props.className}>
            {props.children}
        </div>
    );
}

interface PivotItemListProps<ValueType> {
    listClass: string;
    itemClass: string;
    itemType: string;
    values: Iterable<ValueType>;
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
    const children = [];
    let i = 0;
    for (const value of props.values) {
        children.push(
            <PivotItem key={i} id={i} className={props.itemClass} type={props.itemType} modify={props.modify}>
                {props.valueRenderer(value)}
            </PivotItem>,
        );
        i += 1;
    }
    return (
        <div className={props.listClass} ref={state[1]}>
            {children}
        </div>
    );
}

interface ExplorerProps {
    className?: string;
}

interface PivotConfig {
    groupRowsBy: imm.List<rdt.PivotRowGrouping>;
    groupColumnsBy: imm.List<number>;
    values: imm.List<rdt.PivotAggregate>;
}

export const PivotExplorer: React.FC<ExplorerProps> = (props: ExplorerProps) => {
    const conn = rd.useDuckDBConnection()!;
    const table = rd.useTableSchema();
    const [pivot, setPivot] = React.useState<PivotConfig>({
        groupRowsBy: imm.List(),
        groupColumnsBy: imm.List(),
        values: imm.List([
            {
                expression: 'bid',
                alias: null,
                func: rdt.PivotAggregationFunction.SUM,
            },
            {
                expression: 'ask',
                alias: null,
                func: rdt.PivotAggregationFunction.SUM,
            },
        ]),
    });

    const modify = React.useCallback(
        (m: PivotModification) => {
            // Helper to add a column to a target (row group, column group, values)
            const addTo = (config: PivotConfig, columnId: number, target: string): PivotConfig => {
                const expr = table!.columnNames[columnId]!;
                const alias = table!.columnAliases[columnId] || table!.columnNames[columnId]!;
                switch (target) {
                    // Noop, we don't "add" a table column through the pivot explorer
                    case DRAG_ID_TABLE_COLUMN:
                        return config;

                    // Table column as value
                    case DRAG_ID_VALUE:
                        if (config.values.findIndex(v => v.expression === expr) >= 0) {
                            return config;
                        }
                        return {
                            ...config,
                            values: config.values.push({
                                expression: expr,
                                func: rdt.PivotAggregationFunction.SUM,
                                alias: alias,
                            }),
                        };

                    // Table column as row group
                    case DRAG_ID_ROW_GROUP:
                        if (config.groupRowsBy.findIndex(g => g.expression === expr) >= 0) {
                            return config;
                        }
                        return {
                            ...config,
                            groupRowsBy: config.groupRowsBy.push({
                                expression: expr,
                                alias: alias,
                            }),
                        };

                    // Table column as column group
                    case DRAG_ID_COLUMN_GROUP: {
                        if (config.groupColumnsBy.findIndex(c => c === columnId) >= 0) {
                            return config;
                        }
                        return {
                            ...config,
                            groupColumnsBy: config.groupColumnsBy.push(columnId),
                        };
                    }
                }
                return config;
            };

            // Which source type?
            switch (m.sourceType) {
                case DRAG_ID_TABLE_COLUMN:
                    // We don't delete table columns
                    if (m.targetType == null) {
                        return;
                    }
                    setPivot(p => addTo(p, m.id, m.targetType!));
                    return;

                case DRAG_ID_VALUE:
                    // Remove a value
                    if (m.targetType == null) {
                        setPivot(p => ({
                            ...p,
                            values: p.values.delete(m.id),
                        }));
                        return;
                    }
                    // We never promote a value as row or column grouping
                    return;

                case DRAG_ID_COLUMN_GROUP:
                    // Remove a column grouping
                    if (m.targetType == null) {
                        setPivot(p => ({
                            ...p,
                            groupColumnsBy: p.groupColumnsBy.delete(m.id),
                        }));
                        return;
                    }
                    // Promote to row grouping or value
                    setPivot(p => ({
                        ...addTo(p, pivot.groupColumnsBy.get(m.id)!, m.targetType!),
                        groupColumnsBy: p.groupColumnsBy.delete(m.id),
                    }));
                    return;

                case DRAG_ID_ROW_GROUP: {
                    // Remove a row grouping
                    if (m.targetType == null) {
                        setPivot(p => ({
                            ...p,
                            groupRowsBy: p.groupRowsBy.splice(m.id, 1),
                        }));
                        return;
                    }
                    // Promote to column grouping or value?
                    const expr = pivot.groupRowsBy.get(m.id)!.expression;
                    const columnId = table?.columnNames.findIndex(n => n == expr);
                    if (columnId !== undefined && columnId >= 0) {
                        setPivot(p => ({
                            ...addTo(p, columnId, m.targetType!),
                            groupRowsBy: p.groupRowsBy.splice(m.id, 1),
                        }));
                        return;
                    }
                    // Otherwise just remove
                    setPivot(p => ({
                        ...p,
                        groupRowsBy: p.groupRowsBy.splice(m.id, 1),
                    }));
                    return;
                }

                default:
                    break;
            }
        },
        [table, pivot],
    );

    let values = pivot.values;
    if (values.isEmpty()) {
        values = imm.List(
            table?.columnNames?.map(n => ({
                expression: n,
                alias: null,
                func: rdt.PivotAggregationFunction.SUM,
            })) || [],
        );
    }

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
                    modify={modify}
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
                    modify={modify}
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
                    modify={modify}
                />
            </div>
            <div className={styles.pivot_value_area}>
                <div className={styles.label_left}>Values</div>
                <PivotItemList<rdt.PivotAggregate>
                    listClass={styles.pivot_value_list}
                    itemClass={styles.pivot_value}
                    itemType={DRAG_ID_VALUE}
                    values={pivot.values || []}
                    valueRenderer={n => n.alias || n.expression}
                    modify={modify}
                />
            </div>
            <div className={styles.pivot_body}>
                {pivot.groupColumnsBy.isEmpty() && pivot.groupRowsBy.isEmpty() ? (
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
                        aggregates={values}
                    >
                        <rdt.WiredTableViewer connection={conn} />
                    </rdt.PivotTableProvider>
                )}
            </div>
        </div>
    );
};
