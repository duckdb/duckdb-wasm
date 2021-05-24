select
  l_orderkey,
  sum(l_extendedprice * (1 - l_discount)) as revenue,
  o_orderdate,
  o_shippriority
from
  'customer.parquet',
  'orders.parquet',
  'lineitem.parquet'
where
  c_mktsegment = 'BUILDING'
  and c_custkey = o_custkey
  and l_orderkey = o_orderkey
  and o_orderdate < cast('1995-03-15' AS date)
  and l_shipdate > cast('1995-03-15' AS date)
group by
  l_orderkey,
  o_orderdate,
  o_shippriority
order by
  revenue desc,
  o_orderdate
limit
  10;
