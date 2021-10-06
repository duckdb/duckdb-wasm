import * as arrow from 'apache-arrow';
import { shuffle } from '../utils';

export function generateArrowInt32Table(n: number): [arrow.Schema, arrow.RecordBatch[]] {
    const values = [];
    for (let i = 0; i < n; ++i) {
        values.push(i);
    }
    shuffle(values);
    const schema = new arrow.Schema([new arrow.Field('v', new arrow.Int32())]);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(new arrow.RecordBatch(schema, rows, [arrow.Int32Vector.from(values.slice(i, i + n))]));
        i += rows;
    }
    return [schema, batches];
}

export function generateArrowUtf8Table(n: number, chars: number): [arrow.Schema, arrow.RecordBatch[]] {
    const values = [];
    for (let i = 0; i < n; ++i) {
        values.push(i.toString().padEnd(chars, '#'));
    }
    shuffle(values);
    const schema = new arrow.Schema([new arrow.Field('v', new arrow.Utf8())]);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(new arrow.RecordBatch(schema, rows, [arrow.Utf8Vector.from(values.slice(i, i + n))]));
        i += rows;
    }
    return [schema, batches];
}
