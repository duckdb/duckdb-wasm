import * as arrow from 'apache-arrow';

export interface FlatArrowType {
    /// The type
    type: string;
    /// Is nullable?
    nullable?: boolean;
    /// Decimal precision
    precision?: number;
    /// Decimal scaling
    scale?: number;
    /// Inner type (Lists)
    innerType?: FlatArrowType;
    /// Timezone
    timezone?: string;
    /// Fields
    fields?: FlatArrowField[];
    /// Byte width (FixedSizeBinary)
    byteWidth?: number;
}

export type FlatArrowField = FlatArrowType & { name: string };

export function flattenArrowType(type: arrow.DataType): FlatArrowType {
    switch (type.typeId) {
        case arrow.Type.Binary:
            return { type: 'binary' };
        case arrow.Type.Bool:
            return { type: 'bool' };
        case arrow.Type.Date:
            return { type: 'date' };
        case arrow.Type.DateDay:
            return { type: 'date32[d]' };
        case arrow.Type.DateMillisecond:
            return { type: 'date64[ms]' };
        case arrow.Type.Decimal: {
            const dec = type as arrow.Decimal;
            return { type: 'decimal', precision: dec.precision, scale: dec.scale };
        }
        case arrow.Type.Float:
            return { type: 'float' };
        case arrow.Type.Float16:
            return { type: 'float16' };
        case arrow.Type.Float32:
            return { type: 'float32' };
        case arrow.Type.Float64:
            return { type: 'float64' };
        case arrow.Type.Int:
            return { type: 'int32' };
        case arrow.Type.Int16:
            return { type: 'int16' };
        case arrow.Type.Int32:
            return { type: 'int32' };
        case arrow.Type.Int64:
            return { type: 'int64' };
        case arrow.Type.Uint16:
            return { type: 'uint16' };
        case arrow.Type.Uint32:
            return { type: 'uint32' };
        case arrow.Type.Uint64:
            return { type: 'uint64' };
        case arrow.Type.Uint8:
            return { type: 'uint8' };
        case arrow.Type.IntervalDayTime:
            return { type: 'interval[dt]' };
        case arrow.Type.IntervalYearMonth:
            return { type: 'interval[m]' };
        case arrow.Type.List: {
            const list = type as arrow.List;
            return { type: 'list', innerType: flattenArrowType(list.valueType as arrow.DataType) };
        }
        case arrow.Type.FixedSizeBinary: {
            const bin = type as arrow.FixedSizeBinary;
            return { type: 'fixedsizebinary', byteWidth: bin.byteWidth };
        }
        case arrow.Type.Null:
            return { type: 'null' };
        case arrow.Type.Utf8:
            return { type: 'utf8' };
        case arrow.Type.Struct: {
            const struct_ = type as arrow.Struct;
            return {
                type: 'struct',
                fields: struct_.children.map(c => ({
                    name: c.name,
                    ...flattenArrowType(c.type),
                })),
            };
        }
        case arrow.Type.Time:
            return { type: 'time[s]' };
        case arrow.Type.TimeMicrosecond:
            return { type: 'time[us]' };
        case arrow.Type.TimeMillisecond:
            return { type: 'time[ms]' };
        case arrow.Type.TimeNanosecond:
            return { type: 'time[ns]' };
        case arrow.Type.TimeSecond:
            return { type: 'time[s]' };
        case arrow.Type.Timestamp: {
            const ts = type as arrow.Timestamp;
            return { type: 'timestamp', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampSecond: {
            const ts = type as arrow.TimestampSecond;
            return { type: 'timestamp[s]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMicrosecond: {
            const ts = type as arrow.TimestampMicrosecond;
            return { type: 'timestamp[us]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampNanosecond: {
            const ts = type as arrow.TimestampNanosecond;
            return { type: 'timestamp[ns]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMillisecond: {
            const ts = type as arrow.TimestampMillisecond;
            return { type: 'timestamp[ms]', timezone: ts.timezone || undefined };
        }
    }
    throw new Error(`unsupported arrow type: ${type.toString()}`);
}
