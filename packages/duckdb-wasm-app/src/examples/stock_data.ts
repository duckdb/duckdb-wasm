// The contents of this file were derived from examples in the project Perspective.
// https://github.com/finos/perspective

// Perspective is licensed under Apache 2.0
// Copyright (c) 2017, the Perspective Authors.
//
// This file is part of the Perspective library, distributed under the terms of
// the Apache License 2.0.

import * as arrow from 'apache-arrow';

export const SECURITIES: string[] = [
    'AAPL.N',
    'MSFT.N',
    'AMZN.N',
    'GOOGL.N',
    'FB.N',
    'TSLA.N',
    'BABA.N',
    'TSM.N',
    'V.N',
    'NVDA.N',
    'JPM.N',
    'JNJ.N',
    'WMT.N',
    'UNH.N',
    'MA.N',
    'BAC.N',
    'DIS.N',
    'ASML.N',
    'ADBE.N',
    'CMCSA.N',
    'NKE.N',
    'XOM.N',
    'TM.N',
    'KO.N',
    'ORCL.N',
    'NFLX.N',
];

export const CLIENTS: string[] = ['Homer', 'Marge', 'Bart', 'Lisa', 'Maggie', 'Barney', 'Ned', 'Moe'];

export class StockDataSource {
    protected id: number;
    protected schema: arrow.Schema;

    constructor() {
        this.id = 0;
        this.schema = new arrow.Schema([
            new arrow.Field('name', new arrow.Utf8()),
            new arrow.Field('client', new arrow.Utf8()),
            new arrow.Field('last_update', new arrow.TimestampMillisecond()),
            new arrow.Field('change', new arrow.Float64()),
            new arrow.Field('bid', new arrow.Float64()),
            new arrow.Field('ask', new arrow.Float64()),
            new arrow.Field('volume', new arrow.Float64()),
        ]);
    }

    public genRandom(): number {
        let u = 0,
            v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    public genBatch(batchSize: number): arrow.RecordBatch {
        const names = new arrow.Utf8Builder({ type: new arrow.Utf8() });
        const client = new arrow.Utf8Builder({ type: new arrow.Utf8() });
        const lastUpdate = new arrow.TimestampBuilder({ type: new arrow.TimestampMillisecond() });
        const change = new arrow.Float64Builder({ type: new arrow.Float64() });
        const bid = new arrow.Float64Builder({ type: new arrow.Float64() });
        const ask = new arrow.Float64Builder({ type: new arrow.Float64() });
        const volume = new arrow.Float64Builder({ type: new arrow.Float64() });
        for (let i = 0; i < batchSize; ++i) {
            names.append(SECURITIES[Math.floor(Math.random() * SECURITIES.length)]);
            client.append(CLIENTS[Math.floor(Math.random() * CLIENTS.length)]);
            lastUpdate.append(new Date().getTime());
            change.append(this.genRandom() * 10);
            bid.append(this.genRandom() * 5 + 95);
            ask.append(this.genRandom() * 5 + 105);
            volume.append(this.genRandom() * 5 + 105);
        }
        return new arrow.RecordBatch(
            this.schema,
            arrow.makeData({
                type: new arrow.Struct(this.schema.fields),
                children: [
                    names.finish().flush(),
                    client.finish().flush(),
                    lastUpdate.finish().flush(),
                    change.finish().flush(),
                    bid.finish().flush(),
                    ask.finish().flush(),
                    volume.finish().flush(),
                ],
            }),
        );
    }
}
