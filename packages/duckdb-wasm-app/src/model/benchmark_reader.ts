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
    warning: arrow.Utf8;
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
    warning: string;

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

    for (const row of bm) {
        const tags = row?.tags;
        const tagStrings = [];
        for (let k = 0; k < (tags?.length || 0); ++k) {
            tagStrings.push(tags?.get(k) || '');
        }
        const entry: BenchmarkEntry = {
            key: '',
            benchmarkKey: '',
            systemKey: '',

            timestamp: row?.timestamp || 0,
            name: row?.name || '',
            benchmark: row?.benchmark || '',
            parameters: row?.parameters?.toArray() || new Float64Array(),
            system: row?.system || '',
            tags: tagStrings,
            warning: row?.warning || '',

            cycles: row?.cycles || 0,
            samples: row?.samples || 0,
            meanTime: row?.mean_time || 0,
            standardDeviation: row?.standard_deviation || 0,
            maxTime: row?.max_time || 0,
            minTime: row?.min_time || 0,
            runTime: row?.run_time || 0,
            totalTime: row?.total_time || 0,
        };
        entry.benchmarkKey = `${entry.benchmark}${entry.parameters.length > 0 ? '_' : ''}${entry.parameters.join(
            '_',
        )}`.replace('.', '');
        entry.systemKey = `${entry.system}${entry.tags.length > 0 ? '_' : ''}${entry.tags.join('_')}`.replace('.', '');
        entry.key = `${entry.benchmarkKey}_${entry.systemKey}`;
        entries.push(entry);
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
