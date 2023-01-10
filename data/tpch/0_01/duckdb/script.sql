.open /home/andre/Repositories/duckdb-wasm/data/tpch/0_01/duckdb/db
call dbgen(sf = 0.01);
checkpoint;
.databases
.tables
