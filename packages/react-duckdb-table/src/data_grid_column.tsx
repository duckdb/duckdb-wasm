import * as arrow from 'apache-arrow';
import * as rd from '@duckdb/react-duckdb';
import * as scan from './scan_provider';
import classNames from 'classnames';
import React from 'react';

import styles from './data_grid_column.module.css';

export interface ColumnLayoutInfo {
    headerWidth: number;
    valueAvgWidth: number;
    valueMaxWidth: number;
}

export interface ColumnRenderer {
    getColumnName(): string;
    getLayoutInfo(): ColumnLayoutInfo;
    renderCell(row: number, key: string, style: React.CSSProperties): React.ReactElement;
}

export class TextColumnRenderer implements ColumnRenderer {
    readonly columnName: string;
    readonly valueClassName: string;
    readonly values: string[];
    readonly valueMaxLength: number;
    readonly valueAvgLength: number;

    protected constructor(
        columnName: string,
        valueClassName: string,
        values: string[],
        valueMaxLength: number,
        valueAvgLength: number,
    ) {
        this.columnName = columnName;
        this.valueClassName = valueClassName;
        this.values = values;
        this.valueMaxLength = valueMaxLength;
        this.valueAvgLength = valueAvgLength;
    }

    public static ReadFrom(table: rd.TableSchema, data: arrow.Table, index: number): TextColumnRenderer {
        const column = data.getChildAt(index)!;
        const columnAlias = table.columnAliases[index] ?? data.schema.fields[index].name;
        let valueClassName = styles.data_value_text;
        let printer = (v: any): string | null => v?.toString() || null;

        // Find formatter and classname
        switch (column.type.typeId) {
            case arrow.Type.Int:
            case arrow.Type.Int16:
            case arrow.Type.Int32:
            case arrow.Type.Int64:
            case arrow.Type.Float:
            case arrow.Type.Float16:
            case arrow.Type.Float32:
            case arrow.Type.Float64: {
                valueClassName = styles.data_value_number;
                const fmt = Intl.NumberFormat('en-US');
                printer = (v: any) => (v == null ? null : fmt.format(v));
                break;
            }
            case arrow.Type.Utf8:
                valueClassName = styles.data_value_text;
                printer = (v: any) => v || null;
                break;
            case arrow.Type.TimeMicrosecond:
                console.warn('not implemented: arrow formatting TimeMicrosecond');
                break;
            case arrow.Type.TimeMillisecond:
                console.warn('not implemented: arrow formatting TimeMillisecond');
                break;
            case arrow.Type.Timestamp: {
                valueClassName = styles.data_value_text;
                const type = column.type as arrow.Timestamp;
                const fmt = Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'medium' });
                switch (type.unit) {
                    case arrow.TimeUnit.SECOND:
                        printer = (v: any) => (v == null ? null : fmt.format(new Date(v * 1000)));
                        break;
                    case arrow.TimeUnit.MICROSECOND:
                        printer = (v: any) => (v == null ? null : fmt.format(new Date(v)));
                        break;
                    case arrow.TimeUnit.MILLISECOND:
                    case arrow.TimeUnit.NANOSECOND:
                        console.warn('not implemented: arrow formatting Timestamp');
                        break;
                }
                break;
            }
            case arrow.Type.TimestampMicrosecond:
                console.warn('not implemented: arrow formatting TimestampMicrosecond');
                break;
            case arrow.Type.TimestampMillisecond:
                console.warn('not implemented: arrow formatting TimestampMillisecond');
                break;
            case arrow.Type.TimestampNanosecond:
                console.warn('not implemented: arrow formatting TimestampNanosecond');
                break;
            case arrow.Type.TimeSecond:
                console.warn('not implemented: arrow formatting TimeSecond');
                break;
            case arrow.Type.DateMillisecond:
            case arrow.Type.DateDay:
            case arrow.Type.Date:
                valueClassName = styles.data_value_text;
                const fmt = Intl.DateTimeFormat('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });
                printer = (v: any) => (v == null ? null : fmt.format(v));
                break;

            default:
                break;
        }

        const values = [];
        let valueLengthSum = 0;
        let valueLengthMax = 0;
        for (const value of column) {
            const text = printer(value) || '';
            values.push(text);
            valueLengthSum += text.length;
            valueLengthMax = Math.max(valueLengthMax, text.length);
        }
        return new TextColumnRenderer(
            columnAlias ?? data.schema.fields[index].name,
            valueClassName,
            values,
            valueLengthMax,
            valueLengthSum / values.length,
        );
    }

    public getColumnName(): string {
        return this.columnName;
    }

    public getLayoutInfo(): ColumnLayoutInfo {
        return {
            headerWidth: this.columnName.length,
            valueMaxWidth: this.valueMaxLength,
            valueAvgWidth: this.valueAvgLength,
        };
    }

    public renderCell(row: number, key: string, style: React.CSSProperties): React.ReactElement {
        return (
            <div key={key} className={styles.cell} style={style}>
                <div className={classNames(styles.data_value, this.valueClassName)}>{this.values[row]}</div>
            </div>
        );
    }
}

export function deriveColumnRenderers(table: rd.TableSchema, data: scan.ScanResult): ColumnRenderer[] {
    const columns = [];
    for (let i = 0; i < table.dataColumns; ++i) {
        const renderer = TextColumnRenderer.ReadFrom(table, data.result, i);
        columns.push(renderer);
    }
    return columns;
}
