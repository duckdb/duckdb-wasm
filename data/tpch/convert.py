# Convert tbl to parquet

# convert.py <from-dir> <to-dir>

import pandas as pd
import sys

tables = ['lineitem', 'nation', 'region', 'part', 'supplier', 'partsupp', 'customer', 'orders']

headers = [
    ['l_orderkey', 'l_partkey', 'l_suppkey', 'l_linenumber', 'l_quantity', 'l_extendedprice', 'l_discount', 'l_tax', 'l_returnflag',
        'l_linestatus', 'l_shipdate', 'l_commitdate', 'l_receiptdate', 'l_shipinstruct', 'l_shipmode', 'l_comment', 'unnamed'],
    ['n_nationkey', 'n_name', 'n_regionkey', 'n_comment', 'unnamed'],
    ['r_regionkey', 'r_name', 'r_comment', 'unnamed'],
    ['p_partkey', 'p_name', 'p_mfgr', 'p_brand', 'p_type', 'p_size', 'p_container', 'p_retailprice', 'p_comment', 'unnamed'],
    ['s_suppkey', 's_name', 's_address', 's_nationkey', 's_phone', 's_acctbal', 's_comment', 'unnamed'],
    ['ps_partkey', 'ps_suppkey', 'ps_availqty', 'ps_supplycost', 'ps_comment', 'unnamed'],
    ['c_custkey', 'c_name', 'c_address', 'c_nationkey', 'c_phone', 'c_acctbal', 'c_mktsegment', 'c_comment', 'unnamed'],
    ['o_orderkey', 'o_custkey', 'o_orderstatus', 'o_totalprice', 'o_orderdate',
        'o_orderpriority', 'o_clerk', 'o_shippriority', 'o_comment', 'unnamed']
]

for (i, t) in enumerate(tables):
    print(t)
    data = pd.read_csv(sys.argv[1] + '/' + t + '.tbl', delimiter='|', names=headers[i])
    data.to_parquet(sys.argv[2] + '/' + t + '.parquet')
