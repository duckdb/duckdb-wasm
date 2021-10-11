import * as arrow from 'apache-arrow';
import { shuffle } from '../utils';

export function generateInt32(n: number): number[] {
    const values = [];
    for (let i = 0; i < n; ++i) {
        values.push(i);
    }
    shuffle(values);
    return values;
}

export function generateArrowInt32(n: number): [arrow.Schema, arrow.RecordBatch[]] {
    const values = generateInt32(n);
    const schema = new arrow.Schema([new arrow.Field('v0', new arrow.Int32())]);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(new arrow.RecordBatch(schema, rows, [arrow.Int32Vector.from(values.slice(i, i + n))]));
        i += rows;
    }
    return [schema, batches];
}

export function generate2Int32(n: number, step: number): [number[], number[]] {
    const values0 = [];
    const values1 = [];
    for (let i = 0; i < n; ++i) {
        values0.push(i);
    }
    for (let i = 0; i < n; ++i) {
        values1.push(Math.floor(i / step));
    }
    shuffle(values0);
    shuffle(values1);
    return [values0, values1];
}

export function generateArrow2Int32(n: number, step: number): [arrow.Schema, arrow.RecordBatch[]] {
    const [values0, values1] = generate2Int32(n, step);
    const schema = new arrow.Schema([
        new arrow.Field('v0', new arrow.Int32()),
        new arrow.Field('v1', new arrow.Int32()),
    ]);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(
            new arrow.RecordBatch(schema, rows, [
                arrow.Int32Vector.from(values0.slice(i, i + n)),
                arrow.Int32Vector.from(values1.slice(i, i + n)),
            ]),
        );
        i += rows;
    }
    return [schema, batches];
}

export function generateUtf8(n: number, chars: number): string[] {
    const values = [];
    for (let i = 0; i < n; ++i) {
        values.push(i.toString().padEnd(chars, '#'));
    }
    shuffle(values);
    return values;
}

export function generateArrowUtf8(n: number, chars: number): [arrow.Schema, arrow.RecordBatch[]] {
    const values = generateUtf8(n, chars);
    const schema = new arrow.Schema([new arrow.Field('v0', new arrow.Utf8())]);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(new arrow.RecordBatch(schema, rows, [arrow.Utf8Vector.from(values.slice(i, i + n))]));
        i += rows;
    }
    return [schema, batches];
}

export function generateGroupedInt32(n: number, groupSize: number): [number[], number[]] {
    const values0 = [];
    const values1 = [];
    for (let i = 0; i < n; ++i) {
        values0.push(Math.floor(i / groupSize));
    }
    for (let i = 0; i < n; ++i) {
        values1.push(Math.floor(i % groupSize));
    }
    shuffle(values0);
    shuffle(values1);
    return [values0, values1];
}

export function generateArrowGroupedInt32(n: number, groupSize: number): [arrow.Schema, arrow.RecordBatch[]] {
    const [values0, values1] = generateGroupedInt32(n, groupSize);
    const schema = new arrow.Schema([
        new arrow.Field('v0', new arrow.Int32()),
        new arrow.Field('v1', new arrow.Int32()),
    ]);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(
            new arrow.RecordBatch(schema, rows, [
                arrow.Int32Vector.from(values0.slice(i, i + n)),
                arrow.Int32Vector.from(values1.slice(i, i + n)),
            ]),
        );
        i += rows;
    }
    return [schema, batches];
}

export function generateCSVGroupedInt32(n: number, groupSize: number): string {
    const values0 = [];
    const values1 = [];
    for (let i = 0; i < n; ++i) {
        values0.push(Math.floor(i / groupSize));
    }
    for (let i = 0; i < n; ++i) {
        values1.push(Math.floor(i % groupSize));
    }
    shuffle(values0);
    shuffle(values1);
    let buffer = '';
    for (let i = 0; i < n; ++i) {
        buffer += values0[i].toString();
        buffer += '|';
        buffer += values1[i].toString();
        buffer += '\n';
    }
    return buffer;
}

export function generateJSONGroupedInt32(n: number, groupSize: number): string {
    const values0 = [];
    const values1 = [];
    for (let i = 0; i < n; ++i) {
        values0.push(Math.floor(i / groupSize));
    }
    for (let i = 0; i < n; ++i) {
        values1.push(Math.floor(i % groupSize));
    }
    shuffle(values0);
    shuffle(values1);
    return JSON.stringify({
        v0: values0,
        v1: values1,
    });
}

export function generateArrowXInt32(n: number, cols: number): [arrow.Schema, arrow.RecordBatch[]] {
    const columns = [];
    const fields = [];
    for (let j = 0; j < cols; ++j) {
        const column = [];
        for (let i = 0; i < n; ++i) {
            column.push(i);
        }
        shuffle(column);
        columns.push(column);
        fields.push(new arrow.Field(`v${j}`, new arrow.Int32()));
    }
    const schema = new arrow.Schema(fields);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(
            new arrow.RecordBatch(
                schema,
                rows,
                columns.map(c => arrow.Int32Vector.from(c.slice(i, i + n))),
            ),
        );
        i += rows;
    }
    return [schema, batches];
}
