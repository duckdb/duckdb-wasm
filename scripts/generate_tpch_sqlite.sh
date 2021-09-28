#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
SQLITE_SHELL="sqlite3"
SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}
TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_SQLITE_DB=${TPCH_SF_OUT}/sqlite.db
TPCH_SF_OUT_TBL=${TPCH_SF_OUT}/tbl
SQLITE_SCRIPT_FILE=${TPCH_SF_OUT}/sqlite_script.sql

mkdir -p ${TPCH_SF_OUT}
rm -rf ${TPCH_SF_OUT_SQLITE_DB}

cat << END >${SQLITE_SCRIPT_FILE}
.open ${TPCH_SF_OUT_SQLITE_DB}

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
  o_totalprice    integer not null,
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
  l_quantity      integer not null,
  l_extendedprice integer not null,
  l_discount      integer not null,
  l_tax           integer not null,
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

.import ${TPCH_SF_OUT_TBL}/customer.tbl customer
.import ${TPCH_SF_OUT_TBL}/region.tbl region
.import ${TPCH_SF_OUT_TBL}/nation.tbl nation
.import ${TPCH_SF_OUT_TBL}/orders.tbl orders
.import ${TPCH_SF_OUT_TBL}/part.tbl part
.import ${TPCH_SF_OUT_TBL}/partsupp.tbl partsupp
.import ${TPCH_SF_OUT_TBL}/supplier.tbl supplier
.import ${TPCH_SF_OUT_TBL}/lineitem.tbl lineitem

select count(*) from customer;
select count(*) from region;
select count(*) from nation;
select count(*) from orders;
select count(*) from part;
select count(*) from partsupp;
select count(*) from supplier;
select count(*) from lineitem;

END
${SQLITE_SHELL} --echo < ${SQLITE_SCRIPT_FILE}
echo "TPCH_SF_OUT_SQLITE=${TPCH_SF_OUT_SQLITE_DB}"
