import * as arrow from 'apache-arrow';

export type BenchmarkType = {
    timestamp: arrow.Float64;
    name: arrow.Utf8;
    benchmark: arrow.Utf8;
    system: arrow.Utf8;
    tags: arrow.List<arrow.Utf8>;
    parameters: arrow.List<arrow.Float64>;
    cycles: arrow.Float64;
    samples: arrow.Float64;
    mean_time: arrow.Float64;
    standard_deviation: arrow.Float64;
    max_time: arrow.Float64;
    min_time: arrow.Float64;
    run_time: arrow.Float64;
    total_time: arrow.Float64;
};

export interface BenchmarkEntry {
    key: string;
    benchmarkKey: string;
    systemKey: string;

    timestamp: number;
    name: string;
    benchmark: string;
    system: string;
    tags: string[];
    parameters: Float64Array;

    cycles: number;
    samples: number;
    meanTime: number;
    standardDeviation: number;
    maxTime: number;
    minTime: number;
    runTime: number;
    totalTime: number;
}

export function readBenchmarks(bm: arrow.Table<BenchmarkType>): BenchmarkEntry[] {
    const entries: BenchmarkEntry[] = [];

    const timestampColumn = bm.getColumn('timestamp');
    const nameColumn = bm.getColumn('name');
    const benchmarkColumn = bm.getColumn('benchmark');
    const systemColumn = bm.getColumn('system');
    const tagsColumn = bm.getColumn('tags');
    const parametersColumn = bm.getColumn('parameters');

    const cyclesColumn = bm.getColumn('cycles');
    const samplesColumn = bm.getColumn('samples');
    const meanTimeColumn = bm.getColumn('mean_time');
    const standardDeviationColumn = bm.getColumn('standard_deviation');
    const maxTimeColumn = bm.getColumn('max_time');
    const minTimeColumn = bm.getColumn('min_time');
    const runTimeColumn = bm.getColumn('run_time');
    const totalTimeColumn = bm.getColumn('total_time');

    for (let i = 0; i < nameColumn.chunks.length; ++i) {
        const timestampChunk = timestampColumn.chunks[i];
        const nameChunk = nameColumn.chunks[i];
        const benchmarkChunk = benchmarkColumn.chunks[i];
        const systemChunk = systemColumn.chunks[i];
        const tagsChunk = tagsColumn.chunks[i];
        const parametersChunk = parametersColumn.chunks[i];

        const cyclesChunk = cyclesColumn.chunks[i];
        const samplesChunk = samplesColumn.chunks[i];
        const meanTimeChunk = meanTimeColumn.chunks[i];
        const standardDeviationChunk = standardDeviationColumn.chunks[i];
        const maxTimeChunk = maxTimeColumn.chunks[i];
        const minTimeChunk = minTimeColumn.chunks[i];
        const runTimeChunk = runTimeColumn.chunks[i];
        const totalTimeChunk = totalTimeColumn.chunks[i];

        for (let j = 0; j < nameChunk.length; ++j) {
            const tags = tagsChunk.get(j);
            const tagStrings = [];
            for (let k = 0; k < (tags?.length || 0); ++k) {
                tagStrings.push(tags?.get(k) || '');
            }
            const entry: BenchmarkEntry = {
                key: '',
                benchmarkKey: '',
                systemKey: '',

                timestamp: timestampChunk.get(j) || 0,
                name: nameChunk.get(j) || '',
                benchmark: benchmarkChunk.get(j) || '',
                parameters: parametersChunk.get(j)?.values || new Float64Array(),
                system: systemChunk.get(j) || '',
                tags: tagStrings,

                cycles: cyclesChunk.get(j) || 0,
                samples: samplesChunk.get(j) || 0,
                meanTime: meanTimeChunk.get(j) || 0,
                standardDeviation: standardDeviationChunk.get(j) || 0,
                maxTime: maxTimeChunk.get(j) || 0,
                minTime: minTimeChunk.get(j) || 0,
                runTime: runTimeChunk.get(j) || 0,
                totalTime: totalTimeChunk.get(j) || 0,
            };
            entry.benchmarkKey = `${entry.benchmark}${entry.parameters.length > 0 ? '_' : ''}${entry.parameters.join(
                '_',
            )}`.replace('.', '');
            entry.systemKey = `${entry.system}${entry.tags.length > 0 ? '_' : ''}${entry.tags.join('_')}`.replace(
                '.',
                '',
            );
            entry.key = `${entry.benchmarkKey}_${entry.systemKey}`;
            entries.push(entry);
        }
    }
    return entries;
}

export interface GroupedBenchmarks {
    benchmarks: Map<string, true>;
    systems: Map<string, true>;
    entries: Map<string, BenchmarkEntry>;
}

export function groupBenchmarks(e: BenchmarkEntry[]): GroupedBenchmarks {
    const groups = {
        benchmarks: new Map(),
        systems: new Map(),
        entries: new Map(),
    };
    for (const entry of e) {
        groups.benchmarks.set(entry.benchmarkKey, true);
        groups.systems.set(entry.systemKey, true);
        groups.entries.set(entry.key, entry);
    }
    return groups;
}
