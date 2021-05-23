import file_tbl_customer from '../../../../data/tpch/0_01/tbl/customer.tbl';
import file_tbl_lineitem from '../../../../data/tpch/0_01/tbl/lineitem.tbl';
import file_tbl_nation from '../../../../data/tpch/0_01/tbl/nation.tbl';
import file_tbl_orders from '../../../../data/tpch/0_01/tbl/orders.tbl';
import file_tbl_part from '../../../../data/tpch/0_01/tbl/part.tbl';
import file_tbl_partsupp from '../../../../data/tpch/0_01/tbl/partsupp.tbl';
import file_tbl_region from '../../../../data/tpch/0_01/tbl/region.tbl';

import file_parquet_customer from '../../../../data/tpch/0_01/parquet/customer.parquet';
import file_parquet_lineitem from '../../../../data/tpch/0_01/parquet/lineitem.parquet';
import file_parquet_nation from '../../../../data/tpch/0_01/parquet/nation.parquet';
import file_parquet_orders from '../../../../data/tpch/0_01/parquet/orders.parquet';
import file_parquet_part from '../../../../data/tpch/0_01/parquet/part.parquet';
import file_parquet_partsupp from '../../../../data/tpch/0_01/parquet/partsupp.parquet';
import file_parquet_region from '../../../../data/tpch/0_01/parquet/region.parquet';

export interface FileMetadata {
    name: string;
    url: string;
}

const registerFile = (name: string, url: string): [string, FileMetadata] => [
    name,
    {
        name,
        url,
    },
];

export const FILES: Map<string, FileMetadata> = new Map([
    registerFile('lineitem.tbl', file_tbl_lineitem),
    registerFile('customer.tbl', file_tbl_customer),
    registerFile('nation.tbl', file_tbl_nation),
    registerFile('orders.tbl', file_tbl_orders),
    registerFile('part.tbl', file_tbl_part),
    registerFile('partsupp.tbl', file_tbl_partsupp),
    registerFile('region.tbl', file_tbl_region),

    registerFile('lineitem.parquet', file_parquet_lineitem),
    registerFile('customer.parquet', file_parquet_customer),
    registerFile('nation.parquet', file_parquet_nation),
    registerFile('orders.parquet', file_parquet_orders),
    registerFile('part.parquet', file_parquet_part),
    registerFile('partsupp.parquet', file_parquet_partsupp),
    registerFile('region.parquet', file_parquet_region),
]);
