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
    /// Timezone
    timezone?: string;
    /// Byte width (FixedSizeBinary)
    byteWidth?: number;
    /// Fields
    children?: FlatArrowField[];
}

export type FlatArrowField = FlatArrowType & { name: string };

export function flattenArrowField(name: string, type: arrow.DataType): FlatArrowField {
    switch (type.typeId) {
        case arrow.Type.Binary:
            return { name, type: 'binary' };
        case arrow.Type.Bool:
            return { name, type: 'bool' };
        case arrow.Type.Date:
            return { name, type: 'date' };
        case arrow.Type.DateDay:
            return { name, type: 'date32[d]' };
        case arrow.Type.DateMillisecond:
            return { name, type: 'date64[ms]' };
        case arrow.Type.Decimal: {
            const dec = type as arrow.Decimal;
            return { name, type: 'decimal', precision: dec.precision, scale: dec.scale };
        }
        case arrow.Type.Float:
            return { name, type: 'float' };
        case arrow.Type.Float16:
            return { name, type: 'float16' };
        case arrow.Type.Float32:
            return { name, type: 'float32' };
        case arrow.Type.Float64:
            return { name, type: 'float64' };
        case arrow.Type.Int:
            return { name, type: 'int32' };
        case arrow.Type.Int16:
            return { name, type: 'int16' };
        case arrow.Type.Int32:
            return { name, type: 'int32' };
        case arrow.Type.Int64:
            return { name, type: 'int64' };
        case arrow.Type.Uint16:
            return { name, type: 'uint16' };
        case arrow.Type.Uint32:
            return { name, type: 'uint32' };
        case arrow.Type.Uint64:
            return { name, type: 'uint64' };
        case arrow.Type.Uint8:
            return { name, type: 'uint8' };
        case arrow.Type.IntervalDayTime:
            return { name, type: 'interval[dt]' };
        case arrow.Type.IntervalYearMonth:
            return { name, type: 'interval[m]' };
        case arrow.Type.List: {
            const list = type as arrow.List;
            return { name, type: 'list', children: [flattenArrowField(list.valueField.name, list.valueField.type)] };
        }
        case arrow.Type.FixedSizeBinary: {
            const bin = type as arrow.FixedSizeBinary;
            return { name, type: 'fixedsizebinary', byteWidth: bin.byteWidth };
        }
        case arrow.Type.Null:
            return { name, type: 'null' };
        case arrow.Type.Utf8:
            return { name, type: 'utf8' };
        case arrow.Type.Struct: {
            const struct_ = type as arrow.Struct;
            return {
                name,
                type: 'struct',
                children: struct_.children.map(c => flattenArrowField(c.name, c.type)),
            };
        }
        case arrow.Type.Time:
            return { name, type: 'time[s]' };
        case arrow.Type.TimeMicrosecond:
            return { name, type: 'time[us]' };
        case arrow.Type.TimeMillisecond:
            return { name, type: 'time[ms]' };
        case arrow.Type.TimeNanosecond:
            return { name, type: 'time[ns]' };
        case arrow.Type.TimeSecond:
            return { name, type: 'time[s]' };
        case arrow.Type.Timestamp: {
            const ts = type as arrow.Timestamp;
            return { name, type: 'timestamp', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampSecond: {
            const ts = type as arrow.TimestampSecond;
            return { name, type: 'timestamp[s]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMicrosecond: {
            const ts = type as arrow.TimestampMicrosecond;
            return { name, type: 'timestamp[us]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampNanosecond: {
            const ts = type as arrow.TimestampNanosecond;
            return { name, type: 'timestamp[ns]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMillisecond: {
            const ts = type as arrow.TimestampMillisecond;
            return { name, type: 'timestamp[ms]', timezone: ts.timezone || undefined };
        }
    }
    throw new Error(`unsupported arrow type: ${type.toString()}`);
}
