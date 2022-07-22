.open /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/sqlite.db

create table nation (
  n_nationkey integer primary key not null,
  n_name      text not null,
  n_regionkey integer not null,
  n_comment   text,
  foreign key (n_regionkey) references region(r_regionkey)
);

create table region (
  r_regionkey integer primary key not null,
  r_name      text not null,
  r_comment   text
);

create table part (
  p_partkey     integer primary key not null,
  p_name        text not null,
  p_mfgr        text not null,
  p_brand       text not null,
  p_type        text not null,
  p_size        integer not null,
  p_container   text not null,
  p_retailprice integer not null,
  p_comment     text not null
);

create table supplier (
  s_suppkey   integer primary key not null,
  s_name      text not null,
  s_address   text not null,
  s_nationkey integer not null,
  s_phone     text not null,
  s_acctbal   integer not null,
  s_comment   text not null,
  foreign key (s_nationkey) references nation(n_nationkey)
);

create table partsupp (
  ps_partkey    integer not null,
  ps_suppkey    integer not null,
  ps_availqty   integer not null,
  ps_supplycost integer not null,
  ps_comment    text not null,
  primary key (ps_partkey, ps_suppkey),
  foreign key (ps_suppkey) references supplier(s_suppkey),
  foreign key (ps_partkey) references part(p_partkey)
);

create table customer (
  c_custkey    integer primary key not null,
  c_name       text not null,
  c_address    text not null,
  c_nationkey  integer not null,
  c_phone      text not null,
  c_acctbal    integer not null,
  c_mktsegment text not null,
  c_comment    text not null,
  foreign key (c_nationkey) references nation(n_nationkey)
);

create table orders (
  o_orderkey      integer primary key not null,
  o_custkey       integer not null,
  o_orderstatus   text not null,
  o_totalprice    decimal(12, 2) not null,
  o_orderdate     date not null,
  o_orderpriority text not null,  
  o_clerk         text not null, 
  o_shippriority  integer not null,
  o_comment       text not null,
  foreign key (o_custkey) references customer(c_custkey)
);

create table lineitem (
  l_orderkey      integer not null,
  l_partkey       integer not null,
  l_suppkey       integer not null,
  l_linenumber    integer not null,
  l_quantity      decimal(12, 2) not null,
  l_extendedprice decimal(12, 2) not null,
  l_discount      decimal(12, 2) not null,
  l_tax           decimal(12, 2) not null,
  l_returnflag    text not null,
  l_linestatus    text not null,
  l_shipdate      date not null,
  l_commitdate    date not null,
  l_receiptdate   date not null,
  l_shipinstruct  text not null,
  l_shipmode      text not null,
  l_comment       text not null,
  primary key (l_orderkey, l_linenumber),
  foreign key (l_orderkey) references orders(o_orderkey),
  foreign key (l_partkey, l_suppkey) references partsupp(ps_partkey, ps_suppkey)
);

.databases
.tables

.mode csv
.separator |

.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/customer.tbl customer
.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/region.tbl region
.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/nation.tbl nation
.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/orders.tbl orders
.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/part.tbl part
.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/partsupp.tbl partsupp
.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/supplier.tbl supplier
.import /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/tbl/lineitem.tbl lineitem

select count(*) from customer;
select count(*) from region;
select count(*) from nation;
select count(*) from orders;
select count(*) from part;
select count(*) from partsupp;
select count(*) from supplier;
select count(*) from lineitem;

