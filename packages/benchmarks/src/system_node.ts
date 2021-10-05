import {
    SystemBenchmarkContext,
    SystemBenchmark,
    SqljsSimpleScanBenchmark,
    AlasqlSimpleScanBenchmark,
    ArqueroSimpleScanBenchmark,
    NanoSQLSimpleScanBenchmark,
    LovefieldSimpleScanBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';
import initSQLJs from 'sql.js';

async function main() {
    const sqljsConfig = await initSQLJs();
    const sqljsDB = new sqljsConfig.Database();
    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new LovefieldSimpleScanBenchmark(1000),
        new NanoSQLSimpleScanBenchmark(1000),
        new NanoSQLSimpleScanBenchmark(10000),
        new AlasqlSimpleScanBenchmark(1000),
        new AlasqlSimpleScanBenchmark(100000),
        new ArqueroSimpleScanBenchmark(1000),
        new ArqueroSimpleScanBenchmark(100000),
        new ArqueroSimpleScanBenchmark(1000000),
        new SqljsSimpleScanBenchmark(sqljsDB, 1000),
        new SqljsSimpleScanBenchmark(sqljsDB, 100000),
        new SqljsSimpleScanBenchmark(sqljsDB, 1000000),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
}

main();
