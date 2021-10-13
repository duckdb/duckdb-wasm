import * as lf from 'lovefield-ts/dist/es6/lf.js';
import * as faker from 'faker';
import * as arrow from 'apache-arrow';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { generate2Int32, generateGroupedInt32, generateInt32, generateUtf8, generateXInt32 } from './data_generator';
import { getTPCHArrowTable } from './tpch_loader';
import { Utf8 } from 'apache-arrow';

// Decimals are not properly supported by the arrow javascript library atm.
type DECIMAL_12_2 = arrow.Float64;

export class LovefieldTPCHBenchmark implements SystemBenchmark {
    static builder?: lf.Builder | null;
    static database?: lf.DatabaseConnection | null;
    scaleFactor: number;
    queryId: number;

    constructor(scaleFactor: number, queryId: number) {
        this.scaleFactor = scaleFactor;
        this.queryId = queryId;
    }
    getName(): string {
        return `lovefield_tpch_${this.scaleFactor.toString().replace('.', '')}_q${this.queryId}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        let warning = `Lovefield does not support arithmetic operations and nested subqueries. Aggregates and order by clauses were often simplified. Some queries with nesting were dropped.`;
        if (this.queryId == 13 || this.queryId == 14 || this.queryId == 16 || this.queryId == 18) {
            warning = '';
        }
        return {
            benchmark: 'tpch',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.scaleFactor, this.queryId],
            warning,
        };
    }

    static async beforeGroup(ctx: SystemBenchmarkContext, scaleFactor: number): Promise<void> {
        LovefieldTPCHBenchmark.builder = lf.schema.create(`tpch_schema`, 1);
        const builder = LovefieldTPCHBenchmark.builder;

        const nationBuilder = builder.createTable(`nation`);
        nationBuilder.addColumn('n_nationkey', lf.Type.INTEGER);
        nationBuilder.addColumn('n_name', lf.Type.STRING);
        nationBuilder.addColumn('n_regionkey', lf.Type.NUMBER);
        nationBuilder.addColumn('n_comment', lf.Type.STRING);

        const regionBuilder = builder.createTable(`region`);
        regionBuilder.addColumn('r_regionkey', lf.Type.INTEGER);
        regionBuilder.addColumn('r_name', lf.Type.INTEGER);
        regionBuilder.addColumn('r_comment', lf.Type.STRING);

        const partBuilder = builder.createTable(`part`);
        partBuilder.addColumn('p_partkey', lf.Type.INTEGER);
        partBuilder.addColumn('p_name', lf.Type.STRING);
        partBuilder.addColumn('p_mfgr', lf.Type.STRING);
        partBuilder.addColumn('p_brand', lf.Type.STRING);
        partBuilder.addColumn('p_type', lf.Type.STRING);
        partBuilder.addColumn('p_size', lf.Type.INTEGER);
        partBuilder.addColumn('p_container', lf.Type.STRING);
        partBuilder.addColumn('p_retailprice', lf.Type.NUMBER);
        partBuilder.addColumn('p_comment', lf.Type.STRING);

        const supplierBuilder = builder.createTable(`supplier`);
        supplierBuilder.addColumn('s_suppkey', lf.Type.INTEGER);
        supplierBuilder.addColumn('s_name', lf.Type.STRING);
        supplierBuilder.addColumn('s_address', lf.Type.STRING);
        supplierBuilder.addColumn('s_nationkey', lf.Type.INTEGER);
        supplierBuilder.addColumn('s_phone', lf.Type.STRING);
        supplierBuilder.addColumn('s_acctbal', lf.Type.NUMBER);
        supplierBuilder.addColumn('s_comment', lf.Type.STRING);

        const partsuppBuilder = builder.createTable(`partsupp`);
        partsuppBuilder.addColumn('ps_partkey', lf.Type.INTEGER);
        partsuppBuilder.addColumn('ps_suppkey', lf.Type.INTEGER);
        partsuppBuilder.addColumn('ps_availqty', lf.Type.INTEGER);
        partsuppBuilder.addColumn('ps_supplycost', lf.Type.NUMBER);
        partsuppBuilder.addColumn('ps_comment', lf.Type.STRING);

        const customerBuilder = builder.createTable(`customer`);
        customerBuilder.addColumn('c_custkey', lf.Type.INTEGER);
        customerBuilder.addColumn('c_name', lf.Type.STRING);
        customerBuilder.addColumn('c_address', lf.Type.STRING);
        customerBuilder.addColumn('c_nationkey', lf.Type.INTEGER);
        customerBuilder.addColumn('c_phone', lf.Type.STRING);
        customerBuilder.addColumn('c_acctbal', lf.Type.INTEGER);
        customerBuilder.addColumn('c_mktsegment', lf.Type.STRING);
        customerBuilder.addColumn('c_comment', lf.Type.STRING);

        const ordersBuilder = builder.createTable(`orders`);
        ordersBuilder.addColumn('o_orderkey', lf.Type.INTEGER);
        ordersBuilder.addColumn('o_custkey', lf.Type.INTEGER);
        ordersBuilder.addColumn('o_orderstatus', lf.Type.STRING);
        ordersBuilder.addColumn('o_totalprice', lf.Type.NUMBER);
        ordersBuilder.addColumn('o_orderdate', lf.Type.DATE_TIME);
        ordersBuilder.addColumn('o_orderpriority', lf.Type.STRING);
        ordersBuilder.addColumn('o_clerk', lf.Type.STRING);
        ordersBuilder.addColumn('o_shippriority', lf.Type.INTEGER);
        ordersBuilder.addColumn('o_comment', lf.Type.STRING);

        const lineitemBuilder = builder.createTable(`lineitem`);
        lineitemBuilder.addColumn('l_orderkey', lf.Type.INTEGER);
        lineitemBuilder.addColumn('l_partkey', lf.Type.INTEGER);
        lineitemBuilder.addColumn('l_suppkey', lf.Type.INTEGER);
        lineitemBuilder.addColumn('l_linenumber', lf.Type.INTEGER);
        lineitemBuilder.addColumn('l_quantity', lf.Type.NUMBER);
        lineitemBuilder.addColumn('l_extendedprice', lf.Type.NUMBER);
        lineitemBuilder.addColumn('l_discount', lf.Type.NUMBER);
        lineitemBuilder.addColumn('l_tax', lf.Type.NUMBER);
        lineitemBuilder.addColumn('l_returnflag', lf.Type.STRING);
        lineitemBuilder.addColumn('l_linestatus', lf.Type.STRING);
        lineitemBuilder.addColumn('l_shipdate', lf.Type.DATE_TIME);
        lineitemBuilder.addColumn('l_commitdate', lf.Type.DATE_TIME);
        lineitemBuilder.addColumn('l_receiptdate', lf.Type.DATE_TIME);
        lineitemBuilder.addColumn('l_shipinstruct', lf.Type.STRING);
        lineitemBuilder.addColumn('l_shipmode', lf.Type.STRING);
        lineitemBuilder.addColumn('l_comment', lf.Type.STRING);
        lineitemBuilder.addPrimaryKey(['l_orderkey', 'l_linenumber']);

        LovefieldTPCHBenchmark.database = await builder.connect({ storeType: lf.DataStoreType.MEMORY });
        const database = LovefieldTPCHBenchmark.database;

        // Load partsupp
        const partTable = database.getSchema().table('part');
        const partRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'part.arrow')) as arrow.Table<{
            p_partkey: arrow.Int32;
            p_name: arrow.Utf8;
            p_mfgr: arrow.Utf8;
            p_brand: arrow.Utf8;
            p_type: arrow.Utf8;
            p_size: arrow.Int32;
            p_container: arrow.Utf8;
            p_retailprice: DECIMAL_12_2;
            p_comment: arrow.Utf8;
        }>) {
            partRows.push(
                partTable.createRow({
                    p_partkey: row.p_partkey,
                    p_name: row.p_name,
                    p_mfgr: row.p_mfgr,
                    p_brand: row.p_brand,
                    p_type: row.p_type,
                    p_size: row.p_size,
                    p_container: row.p_container,
                    p_retailprice: row.p_retailprice,
                    p_comment: row.p_comment,
                }),
            );
        }
        await database.insert().into(partTable).values(partRows).exec();

        // Load partsupp
        const partsuppTable = database.getSchema().table('partsupp');
        const partsuppRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'partsupp.arrow')) as arrow.Table<{
            ps_partkey: arrow.Int32;
            ps_suppkey: arrow.Int32;
            ps_availqty: arrow.Int32;
            ps_supplycost: DECIMAL_12_2;
            ps_comment: arrow.Utf8;
        }>) {
            partsuppRows.push(
                partsuppTable.createRow({
                    ps_partkey: row.ps_partkey,
                    ps_suppkey: row.ps_suppkey,
                    ps_availqty: row.ps_availqty,
                    ps_supplycost: row.ps_supplycost,
                    ps_comment: row.ps_comment,
                }),
            );
        }
        await database.insert().into(partsuppTable).values(partsuppRows).exec();

        // Load region
        const regionTable = database!.getSchema().table('region');
        const regionRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'region.arrow')) as arrow.Table<{
            r_regionkey: arrow.Int32;
            r_name: arrow.Utf8;
            r_comment: arrow.Utf8;
        }>) {
            regionRows.push(
                regionTable.createRow({
                    r_nationkey: row.r_regionkey,
                    r_name: row.r_name,
                    r_comment: row.r_comment,
                }),
            );
        }
        await database!.insert().into(regionTable).values(regionRows).exec();

        // Load nation
        const nationTable = database!.getSchema().table('nation');
        const nationRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'nation.arrow')) as arrow.Table<{
            n_nationkey: arrow.Int32;
            n_name: arrow.Utf8;
            n_regionkey: arrow.Int32;
            n_comment: arrow.Utf8;
        }>) {
            nationRows.push(
                nationTable.createRow({
                    n_nationkey: row.n_nationkey,
                    n_name: row.n_name,
                    n_regionkey: row.n_regionkey,
                    n_comment: row.n_comment,
                }),
            );
        }
        await database!.insert().into(nationTable).values(nationRows).exec();

        // Load customer
        const customerTable = database!.getSchema().table('customer');
        const customerRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'customer.arrow')) as arrow.Table<{
            c_custkey: arrow.Int32;
            c_name: arrow.Utf8;
            c_address: arrow.Utf8;
            c_nationkey: arrow.Int32;
            c_phone: arrow.Utf8;
            c_acctbal: DECIMAL_12_2;
            c_mktsegment: Utf8;
            c_comment: Utf8;
        }>) {
            customerRows.push(
                customerTable.createRow({
                    c_custkey: row.c_custkey,
                    c_name: row.c_name,
                    c_address: row.c_address,
                    c_nationkey: row.c_nationkey,
                    c_phone: row.c_phone,
                    c_acctbal: row.c_acctbal,
                    c_mktsegment: row.c_mktsegment,
                    c_comment: row.c_comment,
                }),
            );
        }
        await database!.insert().into(customerTable).values(customerRows).exec();

        // Load orders
        const ordersTable = database!.getSchema().table('orders');
        const ordersRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'orders.arrow')) as arrow.Table<{
            o_orderkey: arrow.Int32;
            o_custkey: arrow.Int32;
            o_orderstatus: arrow.Utf8;
            o_totalprice: DECIMAL_12_2;
            o_orderdate: arrow.DateDay;
            o_orderpriority: arrow.Utf8;
            o_clerk: arrow.Utf8;
            o_shippriority: arrow.Int32;
            o_comment: arrow.Utf8;
        }>) {
            ordersRows.push(
                ordersTable.createRow({
                    o_orderkey: row.o_orderkey,
                    o_custkey: row.o_custkey,
                    o_orderstatus: row.o_orderstatus,
                    o_totalprice: row.o_totalprice,
                    o_orderdate: row.o_orderdate,
                    o_orderpriority: row.o_orderpriority,
                    o_clerk: row.o_clerk,
                    o_shippriority: row.o_shippriority,
                    o_comment: row.o_comment,
                }),
            );
        }
        await database!.insert().into(ordersTable).values(ordersRows).exec();

        // Load supplier
        const supplierTable = database!.getSchema().table('supplier');
        const supplierRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'supplier.arrow')) as arrow.Table<{
            s_suppkey: arrow.Int32;
            s_name: arrow.Utf8;
            s_address: arrow.Utf8;
            s_nationkey: arrow.Int32;
            s_phone: arrow.Utf8;
            s_acctbal: DECIMAL_12_2;
            s_comment: arrow.Utf8;
        }>) {
            supplierRows.push(
                supplierTable.createRow({
                    s_suppkey: row.s_suppkey,
                    s_name: row.s_name,
                    s_address: row.s_address,
                    s_nationkey: row.s_nationkey,
                    s_phone: row.s_phone,
                    s_acctbal: row.s_acctbal,
                    s_comment: row.s_comment,
                }),
            );
        }
        await database!.insert().into(supplierTable).values(supplierRows).exec();

        // Load lineitem
        const lineitemTable = database!.getSchema().table('lineitem');
        const lineitemRows = [];
        for (const row of (await getTPCHArrowTable(ctx.projectRootPath, scaleFactor, 'lineitem.arrow')) as arrow.Table<{
            l_orderkey: arrow.Int32;
            l_partkey: arrow.Int32;
            l_suppkey: arrow.Int32;
            l_linenumber: arrow.Int32;
            l_quantity: DECIMAL_12_2;
            l_extendedprice: DECIMAL_12_2;
            l_discount: DECIMAL_12_2;
            l_tax: DECIMAL_12_2;
            l_returnflag: arrow.Utf8;
            l_linestatus: arrow.Utf8;
            l_shipdate: arrow.DateDay;
            l_commitdate: arrow.DateDay;
            l_receiptdate: arrow.DateDay;
            l_shipinstruct: arrow.DateDay;
            l_shipmode: arrow.Utf8;
            l_comment: arrow.Utf8;
        }>) {
            lineitemRows.push(
                lineitemTable.createRow({
                    l_orderkey: row.l_orderkey,
                    l_partkey: row.l_partkey,
                    l_suppkey: row.l_suppkey,
                    l_linenumber: row.l_linenumber,
                    l_quantity: row.l_quantity,
                    l_extendedprice: row.l_extendedprice,
                    l_discount: row.l_extendedprice,
                    l_tax: row.l_tax,
                    l_returnflag: row.l_returnflag,
                    l_linestatus: row.l_linestatus,
                    l_shipdate: row.l_shipdate,
                    l_commitdate: row.l_commitdate,
                    l_receiptdate: row.l_receiptdate,
                    l_shipinstruct: row.l_shipinstruct,
                    l_shipmode: row.l_shipmode,
                    l_comment: row.l_comment,
                }),
            );
        }
        await database!.insert().into(lineitemTable).values(lineitemRows).exec();
    }
    static async afterGroup(_ctx: SystemBenchmarkContext): Promise<void> {
        const drop = async (name: string) => {
            const table = LovefieldTPCHBenchmark.database!.getSchema().table(name);
            await LovefieldTPCHBenchmark.database!.delete().from(table).exec();
        };
        await drop('lineitem');
        await drop('orders');
        await drop('customer');
        await drop('supplier');
        await drop('part');
        await drop('partsupp');
        await drop('region');
        await drop('nation');
        LovefieldTPCHBenchmark.database!.close();
    }

    async beforeAll(_ctx: SystemBenchmarkContext): Promise<void> {}
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        // XXX
        //
        // Lovefield docs contains
        // * / % + -	User shall use JavaScript for arithmetic operations.
        //
        // Does that mean Lovefield cannot to to arithmetic within the query plan?
        // We "bypass" that limitation by splitting up the aggregates, s.t. the required work stays almost the same.
        // As a result, most lovefield queries won't produce the exact TPC-H results!
        //
        switch (this.queryId) {
            case 1: {
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const query = (await LovefieldTPCHBenchmark.database!.select(
                    lineitem.col('l_returnflag'),
                    lineitem.col('l_linestatus'),
                    lf.fn.sum(lineitem.col('l_quantity')).as('sum_qty'),
                    lf.fn.sum(lineitem.col('l_extendedprice')).as('sum_base_price'),
                    lf.fn.sum(lineitem.col('l_discount')).as('sum_discount_xxx'),
                    lf.fn.sum(lineitem.col('l_tax')).as('sum_tax_xxx'),
                    lf.fn.avg(lineitem.col('l_quantity')).as('avg_qty'),
                    lf.fn.avg(lineitem.col('l_extendedprice')).as('avg_price'),
                    lf.fn.avg(lineitem.col('l_discount')).as('avg_disc'),
                    lf.fn.count().as('count_order'),
                )
                    .from(lineitem)
                    .where(lineitem.col('l_shipdate').lt(new Date(1998, 9, 2)))
                    .groupBy(lineitem.col('l_returnflag'), lineitem.col('l_linestatus'))
                    .orderBy(lineitem.col('l_returnflag'))
                    .orderBy(lineitem.col('l_linestatus'))
                    .exec()) as Iterable<{
                    l_returnflag: number;
                    l_linestatus: string;
                    sum_qty: number;
                    sum_base_price: number;
                    sum_discount: number;
                    sum_tax: number;
                    avg_qty: number;
                    avg_price: number;
                    avg_disc: number;
                    count_order: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 3: {
                const customer = LovefieldTPCHBenchmark.database!.getSchema().table('customer');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const query = (await LovefieldTPCHBenchmark.database!.select(
                    lineitem.col('l_orderkey'),
                    orders.col('o_orderdate'),
                    orders.col('o_shippriority'),
                    lf.fn.sum(lineitem.col('l_extendedprice')).as('sum_price'),
                )
                    .from(customer)
                    .innerJoin(orders, customer.col('c_custkey').eq(orders.col('o_custkey')))
                    .innerJoin(lineitem, lineitem.col('l_orderkey').eq(orders.col('o_orderkey')))
                    .where(
                        lf.op.and(
                            customer.col('c_mktsegment').eq('BUILDING'),
                            lineitem.col('l_shipdate').gt(new Date(1995, 3, 15)),
                            orders.col('o_orderdate').lt(new Date(1995, 3, 15)),
                        ),
                    )
                    .groupBy(lineitem.col('l_orderkey'), orders.col('o_orderdate'), orders.col('o_shippriority'))
                    .orderBy(orders.col('o_orderdate'), lf.Order.DESC)
                    .limit(10)
                    .exec()) as Iterable<{
                    l_orderkey: number;
                    o_orderdate: Date;
                    o_shippriority: string;
                    sum_price: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 4: {
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const query = (await LovefieldTPCHBenchmark.database!.select(
                    orders.col('o_orderpriority'),
                    lf.fn.count().as('order_count'),
                )
                    .from(orders)
                    .innerJoin(lineitem, lineitem.col('l_orderkey').eq(orders.col('o_orderkey')))
                    .where(
                        lf.op.and(
                            lineitem.col('l_commitdate').lt(lineitem.col('l_receiptdate')),
                            orders.col('o_orderdate').gte(new Date(1993, 7, 1)),
                            orders.col('o_orderdate').lt(new Date(1993, 10, 1)),
                        ),
                    )
                    .groupBy(orders.col('o_orderpriority'))
                    .orderBy(orders.col('o_orderpriority'))
                    .exec()) as Iterable<{
                    o_orderpriority: number;
                    order_count: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 5: {
                const customer = LovefieldTPCHBenchmark.database!.getSchema().table('customer');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const supplier = LovefieldTPCHBenchmark.database!.getSchema().table('supplier');
                const nation = LovefieldTPCHBenchmark.database!.getSchema().table('nation');
                const region = LovefieldTPCHBenchmark.database!.getSchema().table('region');
                const query = (await LovefieldTPCHBenchmark.database!.select(
                    nation.col('n_name'),
                    lf.fn.sum(lineitem.col('l_extendedprice')).as('revenue'),
                )
                    .from(region)
                    .innerJoin(nation, region.col('r_regionkey').eq(nation.col('n_regionkey')))
                    .innerJoin(customer, nation.col('n_regionkey').eq(customer.col('c_nationkey')))
                    .innerJoin(orders, customer.col('c_custkey').eq(orders.col('o_custkey')))
                    .innerJoin(lineitem, orders.col('o_orderkey').eq(lineitem.col('l_orderkey')))
                    .innerJoin(
                        supplier,
                        lf.op.and(
                            supplier.col('s_nationkey').eq(nation.col('n_nationkey')),
                            supplier.col('s_suppkey').eq(lineitem.col('l_suppkey')),
                        ),
                    )
                    .where(
                        lf.op.and(
                            region.col('r_name').eq('ASIA'),
                            orders.col('o_orderdate').between(new Date(1994, 1, 1), new Date(1994, 12, 32)),
                        ),
                    )
                    .groupBy(nation.col('n_name'))
                    .orderBy(nation.col('n_name'))
                    .exec()) as Iterable<{
                    n_name: string;
                    revenue: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 6: {
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const query = (await LovefieldTPCHBenchmark.database!.select(lf.fn.sum(lineitem.col('l_extendedprice')))
                    .from(lineitem)
                    .where(
                        lf.op.and(
                            lineitem.col('l_shipdate').gte(new Date(1994, 1, 1)),
                            lineitem.col('l_shipdate').lt(new Date(1995, 1, 1)),
                            lineitem.col('l_quantity').lt(24),
                            lineitem.col('l_discount').between(0.05, 0.07),
                        ),
                    )
                    .exec()) as Iterable<{
                    revenue: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 7: {
                const customer = LovefieldTPCHBenchmark.database!.getSchema().table('customer');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const supplier = LovefieldTPCHBenchmark.database!.getSchema().table('supplier');
                const nation1 = LovefieldTPCHBenchmark.database!.getSchema().table('nation').as('n1');
                const nation2 = LovefieldTPCHBenchmark.database!.getSchema().table('nation').as('n2');

                const query = (await LovefieldTPCHBenchmark.database!.select(
                    nation1.col('n_name').as('supp_nation'),
                    nation2.col('n_name').as('cust_nation'),
                    lf.fn.sum(lineitem.col('l_extendedprice')).as('volume'),
                )
                    .from(nation1)
                    .innerJoin(
                        nation2,
                        lf.op.or(
                            lf.op.and(nation1.col('n_name').eq('FRANCE'), nation2.col('n_name').eq('GERMANY')),
                            lf.op.and(nation1.col('n_name').eq('GERMANY'), nation2.col('n_name').eq('FRANCY')),
                        ),
                    )
                    .innerJoin(supplier, nation1.col('n_nationkey').eq(supplier.col('s_nationkey')))
                    .innerJoin(customer, nation2.col('n_nationkey').eq(customer.col('c_nationkey')))
                    .innerJoin(orders, customer.col('c_custkey').eq(orders.col('o_custkey')))
                    .innerJoin(
                        lineitem,
                        lf.op.and(
                            supplier.col('s_suppkey').eq(lineitem.col('l_suppkey')),
                            orders.col('o_orderkey').eq(lineitem.col('l_orderkey')),
                        ),
                    )
                    .where(lineitem.col('l_shipdate').between(new Date(1995, 1, 1), new Date(1996, 12, 31)))
                    .groupBy(nation1.col('n_name'), nation2.col('n_name'))
                    .orderBy(nation1.col('n_name'))
                    .orderBy(nation2.col('n_name'))
                    .exec()) as Iterable<{
                    supp_nation: string;
                    cust_nation: string;
                    volume: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 8: {
                const part = LovefieldTPCHBenchmark.database!.getSchema().table('part');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const customer = LovefieldTPCHBenchmark.database!.getSchema().table('customer');
                const supplier = LovefieldTPCHBenchmark.database!.getSchema().table('supplier');
                const region = LovefieldTPCHBenchmark.database!.getSchema().table('region');
                const nation1 = LovefieldTPCHBenchmark.database!.getSchema().table('nation').as('n1');
                const nation2 = LovefieldTPCHBenchmark.database!.getSchema().table('nation').as('n2');

                const query = (await LovefieldTPCHBenchmark.database!.select(
                    nation2.col('n_name'),
                    lf.fn.sum(lineitem.col('l_extendedprice')).as('volume'),
                )
                    .from(part, region, nation1, nation2, lineitem, orders, customer, supplier)
                    .where(
                        lf.op.and(
                            part.col('p_partkey').eq(lineitem.col('l_partkey')),
                            supplier.col('s_suppkey').eq(lineitem.col('l_suppkey')),
                            lineitem.col('l_orderkey').eq(orders.col('o_orderkey')),
                            orders.col('o_custkey').eq(customer.col('c_custkey')),
                            customer.col('c_nationkey').eq(nation1.col('n_nationkey')),
                            nation1.col('n_regionkey').eq(region.col('r_regionkey')),
                            region.col('r_name').eq('AMERICA'),
                            supplier.col('s_nationkey').eq(nation2.col('n_nationkey')),
                            orders.col('o_orderdate').between(new Date(1995, 1, 1), new Date(1996, 12, 31)),
                            part.col('p_type').eq('ECONOMY ANODIZED STEEL'),
                        ),
                    )
                    .groupBy(nation2.col('n_name'))
                    .exec()) as Iterable<{
                    n_name: string;
                    volume: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 9: {
                const nation = LovefieldTPCHBenchmark.database!.getSchema().table('nation');
                const supplier = LovefieldTPCHBenchmark.database!.getSchema().table('supplier');
                const part = LovefieldTPCHBenchmark.database!.getSchema().table('part');
                const partsupp = LovefieldTPCHBenchmark.database!.getSchema().table('partsupp');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');

                const query = (await LovefieldTPCHBenchmark.database!.select(
                    nation.col('n_name'),
                    lf.fn.sum(lineitem.col('l_extendedprice')).as('price_sum'),
                    lf.fn.sum(lineitem.col('l_discount')).as('discount_sum'),
                    lf.fn.sum(lineitem.col('l_quantity')).as('quantity_sum'),
                    lf.fn.sum(partsupp.col('ps_supplycost')).as('supplycost_sum'),
                )
                    .from(supplier, lineitem, partsupp, orders, nation, part)
                    .where(
                        lf.op.and(
                            supplier.col('s_suppkey').eq(lineitem.col('l_suppkey')),
                            partsupp.col('ps_suppkey').eq(lineitem.col('l_suppkey')),
                            partsupp.col('ps_partkey').eq(lineitem.col('l_partkey')),
                            part.col('p_partkey').eq(lineitem.col('l_partkey')),
                            orders.col('o_orderkey').eq(lineitem.col('l_orderkey')),
                            supplier.col('s_nationkey').eq(nation.col('n_nationkey')),
                            part.col('p_name').match(/.*green.*/),
                        ),
                    )
                    .groupBy(nation.col('n_name'))
                    .orderBy(nation.col('n_name'))
                    .exec()) as Iterable<{
                    n_name: string;
                    price_sum: number;
                    discount_sum: number;
                    quantity_sum: number;
                    supplycost_sum: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 10: {
                const nation = LovefieldTPCHBenchmark.database!.getSchema().table('nation');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const customer = LovefieldTPCHBenchmark.database!.getSchema().table('customer');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');

                const query = (await LovefieldTPCHBenchmark.database!.select(
                    customer.col('c_custkey'),
                    customer.col('c_name'),
                    lf.fn.sum(lineitem.col('l_extendedprice')).as('revenue'),
                    customer.col('c_acctbal'),
                    nation.col('n_name'),
                    customer.col('c_address'),
                    customer.col('c_phone'),
                    customer.col('c_comment'),
                )
                    .from(customer, orders, lineitem, orders)
                    .where(
                        lf.op.and(
                            customer.col('c_custkey').eq(orders.col('o_custkey')),
                            lineitem.col('l_orderkey').eq(orders.col('o_orderkey')),
                            orders.col('o_orderdate').between(new Date(1993, 10, 1), new Date(1994, 1, 1)),
                            lineitem.col('l_returnflag').eq('R'),
                            customer.col('c_nationkey').eq(nation.col('n_nationkey')),
                        ),
                    )
                    .groupBy(
                        customer.col('c_custkey'),
                        customer.col('c_name'),
                        customer.col('c_acctbal'),
                        nation.col('n_name'),
                        customer.col('c_address'),
                        customer.col('c_phone'),
                        customer.col('c_comment'),
                    )
                    .orderBy(lf.fn.sum(lineitem.col('l_extendedprice')))
                    .limit(20)
                    .exec()) as Iterable<{
                    c_custkey: number;
                    c_name: string;
                    revenue: number;
                    c_acctbal: number;
                    n_name: string;
                    c_address: string;
                    c_phone: string;
                    c_comment: string;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 12: {
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');

                const query = (await LovefieldTPCHBenchmark.database!.select(
                    lineitem.col('l_shipmode'),
                    lf.fn.count().as('count_xx'),
                )
                    .from(lineitem, orders)
                    .where(
                        lf.op.and(
                            orders.col('o_orderkey').eq(lineitem.col('l_orderkey')),
                            lf.op.or(lineitem.col('l_shipmode').eq('MAIL'), lineitem.col('l_shipmode').eq('SHIP')),
                            lineitem.col('l_commitdate').lt(lineitem.col('l_receiptdate')),
                            lineitem.col('l_shipdate').lt(lineitem.col('l_commitdate')),
                            lineitem.col('l_receiptdate').gte(new Date(1994, 1, 1)),
                            lineitem.col('l_receiptdate').lt(new Date(1995, 1, 1)),
                        ),
                    )
                    .groupBy(lineitem.col('l_shipmode'))
                    .orderBy(lineitem.col('l_shipmode'))
                    .exec()) as Iterable<{
                    l_shipmode: string;
                    count_xx: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 13: {
                const customer = LovefieldTPCHBenchmark.database!.getSchema().table('customer');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const query = (await LovefieldTPCHBenchmark.database!.select(
                    customer.col('c_custkey').as('c_custkey'),
                    lf.fn.count(orders.col('o_orderkey')).as('c_count'),
                )
                    .from(customer)
                    .leftOuterJoin(orders, customer.col('c_custkey').eq(orders.col('o_custkey')))
                    .where(lf.op.not(orders.col('o_comment').match(/.*special.*request.*/)))
                    .groupBy(customer.col('c_custkey'))
                    .exec()) as Iterable<{
                    c_custkey: number;
                    c_count: number;
                }>;

                // How do we do this in lovefield instead of js?
                const custdist = new Map();
                for (const row of query) {
                    custdist.set(row.c_count, (custdist.get(row.c_count) || 0) + 1);
                }
                const entries = [...custdist.entries()];
                entries.sort((l, r) => (l[1] < r[1] || (l[1] == r[1] && l[0] <= r[0]) ? -1 : 1));
                for (const [k, v] of custdist) {
                    noop([k, v]);
                }
                break;
            }
            case 14: {
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const part = LovefieldTPCHBenchmark.database!.getSchema().table('part');

                const query = (await LovefieldTPCHBenchmark.database!.select(
                    part.col('p_type').as('p_type'),
                    lineitem.col('l_extendedprice').as('l_extendedprice'),
                    lineitem.col('l_discount').as('l_discount'),
                )
                    .from(lineitem, part)
                    .where(
                        lf.op.and(
                            lineitem.col('l_partkey').eq(part.col('p_partkey')),
                            lineitem.col('l_shipdate').gte(new Date(1995, 9, 1)),
                            lineitem.col('l_shipdate').lt(new Date(1995, 10, 1)),
                        ),
                    )
                    .exec()) as Iterable<{
                    p_type: string;
                    l_extendedprice: number;
                    l_discount: number;
                }>;
                let sum_promo = 0;
                let sum_total = 0;
                for (const row of query) {
                    sum_promo += row.p_type.match(/^PROMO.*/) ? row.l_extendedprice * (1 - row.l_discount) : 0;
                    sum_total += row.l_extendedprice * (1 - row.l_discount);
                }
                noop((100 * sum_promo) / sum_total);
                break;
            }
            case 16: {
                const supplier = LovefieldTPCHBenchmark.database!.getSchema().table('supplier');
                const part = LovefieldTPCHBenchmark.database!.getSchema().table('part');
                const partsupp = LovefieldTPCHBenchmark.database!.getSchema().table('partsupp');

                const supp = (await LovefieldTPCHBenchmark.database!.select(supplier.col('s_suppkey').as('s_suppkey'))
                    .from(supplier)
                    .where(supplier.col('s_comment').match(/.*Customer.*Complaints.*/))
                    .exec()) as Iterable<{ s_suppkey: number }>;
                const suppkeys = [...supp].map(s => s.s_suppkey);
                const query = (await LovefieldTPCHBenchmark.database!.select(
                    part.col('p_brand'),
                    part.col('p_type'),
                    part.col('p_size'),
                    lf.fn.count(lf.fn.distinct(partsupp.col('ps_suppkey'))).as('supplier_cnt'),
                )
                    .from(part, partsupp)
                    .where(
                        lf.op.and(
                            part.col('p_partkey').eq(partsupp.col('ps_partkey')),
                            lf.op.not(part.col('p_brand').eq('Brand#45')),
                            lf.op.not(part.col('p_type').match(/^MEDIUM POLISHED.*/)),
                            part.col('p_size').in([49, 14, 23, 45, 19, 3, 36, 9]),
                            lf.op.not(partsupp.col('ps_suppkey').in(suppkeys)),
                        ),
                    )
                    .groupBy(part.col('p_brand'), part.col('p_type'), part.col('p_size'), partsupp.col('ps_suppkey'))
                    .orderBy(part.col('p_brand'))
                    .orderBy(part.col('p_type'))
                    .orderBy(part.col('p_size'))
                    .exec()) as Iterable<{
                    p_brand: string;
                    p_type: string;
                    p_size: number;
                    supplier_cnt: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            case 17: {
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');
                const part = LovefieldTPCHBenchmark.database!.getSchema().table('part');
                const query = (await LovefieldTPCHBenchmark.database!.select(
                    lineitem.col('l_extendedprice'),
                    lineitem.col('l_discount'),
                )
                    .from(lineitem)
                    .innerJoin(part, part.col('p_partkey').eq(lineitem.col('l_partkey')))
                    .where(
                        lf.op.or(
                            lf.op.and(
                                part.col('p_brand').eq('Brand#12'),
                                part.col('p_container').in(['SM CASE', 'SM BOX', 'SM PACK', 'SM PKG']),
                                part.col('p_size').between(1, 5),
                                lineitem.col('l_quantity').gte(1),
                                lineitem.col('l_quantity').lte(11),
                                lineitem.col('l_shipmode').in(['AIR', 'AIR REG']),
                                lineitem.col('l_shipinstruct').eq('DELIVER IN PERSON'),
                            ),
                            lf.op.and(
                                part.col('p_brand').eq('Brand#23'),
                                part.col('p_container').in(['MED BAG', 'MED BOX', 'MED PKG', 'MED PACK']),
                                part.col('p_size').between(1, 10),
                                lineitem.col('l_quantity').gte(10),
                                lineitem.col('l_quantity').lte(20),
                                lineitem.col('l_shipmode').in(['AIR', 'AIR REG']),
                                lineitem.col('l_shipinstruct').eq('DELIVER IN PERSON'),
                            ),
                            lf.op.and(
                                part.col('p_brand').eq('Brand#34'),
                                part.col('p_container').in(['LG CASE', 'LG BOX', 'LG PACK', 'LG PKG']),
                                part.col('p_size').between(1, 15),
                                lineitem.col('l_quantity').gte(20),
                                lineitem.col('l_quantity').lte(30),
                                lineitem.col('l_shipmode').in(['AIR', 'AIR REG']),
                                lineitem.col('l_shipinstruct').eq('DELIVER IN PERSON'),
                            ),
                        ),
                    )
                    .exec()) as Iterable<{
                    l_extendedprice: number;
                    l_discount: number;
                }>;
                let revenue = 0;
                for (const row of query) {
                    revenue += row.l_extendedprice * (1 - row.l_discount);
                }
                noop(revenue);
                break;
            }
            case 18: {
                const customer = LovefieldTPCHBenchmark.database!.getSchema().table('customer');
                const orders = LovefieldTPCHBenchmark.database!.getSchema().table('orders');
                const lineitem = LovefieldTPCHBenchmark.database!.getSchema().table('lineitem');

                const sub = (await LovefieldTPCHBenchmark.database!.select(
                    lineitem.col('l_orderkey'),
                    lf.fn.sum(lineitem.col('l_quantity')).as('sum_quantity'),
                )
                    .from(lineitem)
                    .groupBy(lineitem.col('l_orderkey'))
                    .exec()) as Iterable<{ l_orderkey: number; sum_quantity: number }>;
                const orderkeys = [...sub].filter(o => o.sum_quantity > 300).map(o => o.l_orderkey);

                const query = (await LovefieldTPCHBenchmark.database!.select(
                    customer.col('c_name'),
                    customer.col('c_custkey'),
                    orders.col('o_orderkey'),
                    orders.col('o_orderdate'),
                    orders.col('o_totalprice'),
                    lf.fn.sum(lineitem.col('l_quantity')).as('sum_quantity'),
                )
                    .from(customer, orders, lineitem)
                    .where(
                        lf.op.and(
                            customer.col('c_custkey').eq(orders.col('o_custkey')),
                            orders.col('o_orderkey').eq(lineitem.col('l_orderkey')),
                            orders.col('o_orderkey').in(orderkeys),
                        ),
                    )
                    .groupBy(
                        customer.col('c_name'),
                        customer.col('c_custkey'),
                        orders.col('o_orderkey'),
                        orders.col('o_orderdate'),
                        orders.col('o_totalprice'),
                    )
                    .orderBy(orders.col('o_totalprice'), lf.Order.DESC)
                    .orderBy(orders.col('o_orderdate'))
                    .limit(100)
                    .exec()) as Iterable<{
                    c_name: string;
                    c_custkey: number;
                    o_orderkey: number;
                    o_orderdate: Date;
                    o_totalprice: number;
                    sum_quantity: number;
                }>;
                for (const row of query) {
                    noop(row);
                }
                break;
            }
            default: {
                throw new Error('not implemented');
            }
        }
    }

    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {}
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        this.afterAll(ctx);
    }
}

export class LovefieldRegexScanBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;
    chars: number;

    constructor(tuples: number, chars: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `lovefield_regex_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'regex',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.chars],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create table
        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        tableBuilder.addColumn('v0', lf.Type.STRING);

        // Get table
        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const table = this.database!.getSchema().table(this.getName());
        const rows = [];
        for (const value of generateUtf8(this.tuples, this.chars)) {
            rows.push(table.createRow({ v0: value }));
        }

        // Insert values
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        const rows = (await this.database!.select()
            .from(table)
            .where(table.col('v0').match(/^.#.*/))
            .exec()) as Iterable<{
            v0: number;
        }>;
        let n = 0;
        for (const row of rows) {
            noop(row);
            n += 1;
        }
        if (n !== 10) {
            throw Error(`invalid tuple count. expected 10, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        await this.database!.delete().from(table).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}

export class LovefieldIntegerSumBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;
    groupSize: number;

    constructor(tuples: number, groupSize: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
        this.groupSize = groupSize;
    }
    getName(): string {
        return `lovefield_integer_sum_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sum',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.groupSize],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        tableBuilder.addColumn('v0', lf.Type.INTEGER);
        tableBuilder.addColumn('v1', lf.Type.INTEGER);

        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const table = this.database!.getSchema().table(this.getName());
        const rows = [];
        const [values0, values1] = generateGroupedInt32(this.tuples, this.groupSize);
        for (let i = 0; i < values0.length; ++i) {
            rows.push(table.createRow({ v0: values0[i], v1: values1[i] }));
        }
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        const rows = (await this.database!.select(table.col('v0'), lf.fn.sum(table.col('v1')))
            .from(table)
            .groupBy(table.col('v0'))
            .exec()) as Iterable<{
            v0: number;
        }>;
        let n = 0;
        for (const row of rows) {
            noop(row);
            n += 1;
        }
        const expectedGroups = this.tuples / this.groupSize;
        if (n !== expectedGroups) {
            throw Error(`invalid tuple count. expected ${expectedGroups}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        await this.database!.delete().from(table).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}

export class LovefieldIntegerSortBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;
    columnCount: number;
    orderBy: string[];

    constructor(tuples: number, columnCount: number, orderCriteria: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
        this.columnCount = columnCount;
        this.orderBy = [];
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `lovefield_integer_sort_${this.tuples}_${this.columnCount}_${this.orderBy.length}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sort',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        const columns = generateXInt32(this.tuples, this.columnCount);
        for (let i = 0; i < columns.length; ++i) {
            tableBuilder.addColumn(`v${i}`, lf.Type.INTEGER);
        }

        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const table = this.database!.getSchema().table(this.getName());
        const rows = [];
        for (let i = 0; i < columns[0].length; ++i) {
            const row: any = {};
            for (let j = 0; j < columns.length; ++j) {
                row[`v${j}`] = columns[j][i];
            }
            rows.push(table.createRow(row));
        }
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        let query = this.database!.select().from(table);
        for (let i = 0; i < this.columnCount; ++i) {
            query = query.orderBy(table.col(`v${i}`));
        }
        const rows = (await query.exec()) as Iterable<{
            v0: number;
        }>;
        let n = 0;
        for (const row of rows) {
            noop(row);
            n += 1;
        }
        if (this.tuples !== n) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        await this.database!.delete().from(table).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}

export class LovefieldIntegerTopKBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;
    columnCount: number;
    orderBy: string[];
    k: number;

    constructor(tuples: number, columnCount: number, orderCriteria: number, k: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
        this.columnCount = columnCount;
        this.orderBy = [];
        this.k = k;
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `lovefield_integer_sort_${this.tuples}_${this.columnCount}_${this.orderBy.length}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_topk',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length, this.k],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        const columns = generateXInt32(this.tuples, this.columnCount);
        for (let i = 0; i < columns.length; ++i) {
            tableBuilder.addColumn(`v${i}`, lf.Type.INTEGER);
        }

        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const table = this.database!.getSchema().table(this.getName());
        const rows = [];
        for (let i = 0; i < columns[0].length; ++i) {
            const row: any = {};
            for (let j = 0; j < columns.length; ++j) {
                row[`v${j}`] = columns[j][i];
            }
            rows.push(table.createRow(row));
        }
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        let query = this.database!.select().from(table);
        for (let i = 0; i < this.columnCount; ++i) {
            query = query.orderBy(table.col(`v${i}`));
        }
        const rows = (await query.limit(this.k).exec()) as Iterable<{
            v0: number;
        }>;
        let n = 0;
        for (const row of rows) {
            noop(row);
            n += 1;
        }
        if (n !== this.k) {
            throw Error(`invalid tuple count. expected ${this.k}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        await this.database!.delete().from(table).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}

export class LovefieldIntegerJoin2Benchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuplesA: number;
    tuplesB: number;
    filterA: number;
    stepAB: number;

    constructor(a: number, b: number, filterA: number, stepAB: number) {
        this.builder = null;
        this.database = null;
        this.tuplesA = a;
        this.tuplesB = b;
        this.filterA = filterA;
        this.stepAB = stepAB;
    }
    getName(): string {
        return `lovefield_integer_join2_${this.tuplesA}_${this.tuplesB}_${this.filterA}_${this.stepAB}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join2',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.stepAB, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const valuesA = generateInt32(this.tuplesA);
        const [valuesB0, valuesB1] = generate2Int32(this.tuplesB, this.stepAB);

        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableABuilder = this.builder!.createTable(`${this.getName()}_a`);
        tableABuilder.addColumn('v0', lf.Type.INTEGER);
        const tableBBuilder = this.builder!.createTable(`${this.getName()}_b`);
        tableBBuilder.addColumn('v0', lf.Type.INTEGER);
        tableBBuilder.addColumn('v1', lf.Type.INTEGER);

        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const tableA = this.database!.getSchema().table(`${this.getName()}_a`);
        const rowsA = valuesA.map(v0 => tableA.createRow({ v0 }));
        await this.database!.insert().into(tableA).values(rowsA).exec();

        const tableB = this.database!.getSchema().table(`${this.getName()}_b`);
        const rowsB = [];
        for (let i = 0; i < valuesB0.length; ++i) {
            rowsB.push(
                tableB.createRow({
                    v0: valuesB0[i],
                    v1: valuesB1[i],
                }),
            );
        }
        await this.database!.insert().into(tableB).values(rowsB).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const tableA = this.database!.getSchema().table(`${this.getName()}_a`);
        const tableB = this.database!.getSchema().table(`${this.getName()}_b`);
        const query = (await this.database!.select()
            .from(tableA)
            .innerJoin(tableB, tableA.col('v0').eq(tableB.col('v1')))
            .where(tableA.col('v0').lt(this.filterA))
            .exec()) as Iterable<{
            v0: number;
            v1: number;
        }>;
        let n = 0;
        for (const row of query) {
            noop(row);
            n += 1;
        }
        const expected = this.filterA * this.stepAB;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        const tableA = this.database!.getSchema().table(`${this.getName()}_a`);
        const tableB = this.database!.getSchema().table(`${this.getName()}_b`);
        await this.database!.delete().from(tableA).exec();
        await this.database!.delete().from(tableB).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}

export class LovefieldIntegerJoin3Benchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuplesA: number;
    tuplesB: number;
    tuplesC: number;
    filterA: number;
    stepAB: number;
    stepBC: number;

    constructor(a: number, b: number, c: number, filterA: number, stepAB: number, stepBC: number) {
        this.builder = null;
        this.database = null;
        this.tuplesA = a;
        this.tuplesB = b;
        this.tuplesC = c;
        this.filterA = filterA;
        this.stepAB = stepAB;
        this.stepBC = stepBC;
    }
    getName(): string {
        return `lovefield_integer_join3_${this.tuplesA}_${this.tuplesB}_${this.tuplesC}_${this.filterA}_${this.stepAB}_${this.stepBC}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join3',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.tuplesC, this.stepAB, this.stepBC, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const valuesA = generateInt32(this.tuplesA);
        const [valuesB0, valuesB1] = generate2Int32(this.tuplesB, this.stepAB);
        const [valuesC0, valuesC1] = generate2Int32(this.tuplesC, this.stepBC);

        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableABuilder = this.builder!.createTable(`${this.getName()}_a`);
        tableABuilder.addColumn('v0', lf.Type.INTEGER);
        const tableBBuilder = this.builder!.createTable(`${this.getName()}_b`);
        tableBBuilder.addColumn('v0', lf.Type.INTEGER);
        tableBBuilder.addColumn('v1', lf.Type.INTEGER);
        const tableCBuilder = this.builder!.createTable(`${this.getName()}_c`);
        tableCBuilder.addColumn('v0', lf.Type.INTEGER);
        tableCBuilder.addColumn('v1', lf.Type.INTEGER);

        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const tableA = this.database!.getSchema().table(`${this.getName()}_a`);
        const rowsA = valuesA.map(v0 => tableA.createRow({ v0 }));
        await this.database!.insert().into(tableA).values(rowsA).exec();

        const tableB = this.database!.getSchema().table(`${this.getName()}_b`);
        const rowsB = [];
        for (let i = 0; i < valuesB0.length; ++i) {
            rowsB.push(
                tableB.createRow({
                    v0: valuesB0[i],
                    v1: valuesB1[i],
                }),
            );
        }
        await this.database!.insert().into(tableB).values(rowsB).exec();

        const tableC = this.database!.getSchema().table(`${this.getName()}_c`);
        const rowsC = [];
        for (let i = 0; i < valuesC0.length; ++i) {
            rowsC.push(
                tableC.createRow({
                    v0: valuesC0[i],
                    v1: valuesC1[i],
                }),
            );
        }
        await this.database!.insert().into(tableC).values(rowsC).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const tableA = this.database!.getSchema().table(`${this.getName()}_a`);
        const tableB = this.database!.getSchema().table(`${this.getName()}_b`);
        const tableC = this.database!.getSchema().table(`${this.getName()}_c`);
        const query = (await this.database!.select()
            .from(tableA)
            .innerJoin(tableB, tableA.col('v0').eq(tableB.col('v1')))
            .innerJoin(tableC, tableB.col('v0').eq(tableC.col('v1')))
            .where(tableA.col('v0').lt(this.filterA))
            .exec()) as Iterable<{
            v0: number;
            v1: number;
        }>;
        let n = 0;
        for (const row of query) {
            noop(row);
            n += 1;
        }
        const expected = this.filterA * this.stepAB * this.stepBC;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        const tableA = this.database!.getSchema().table(`${this.getName()}_a`);
        const tableB = this.database!.getSchema().table(`${this.getName()}_b`);
        const tableC = this.database!.getSchema().table(`${this.getName()}_c`);
        await this.database!.delete().from(tableA).exec();
        await this.database!.delete().from(tableB).exec();
        await this.database!.delete().from(tableC).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}
