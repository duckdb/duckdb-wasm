import { Event } from 'benchmark';
import { Summary } from './types';
import { getCaseResult } from './result';

function roundNumbersToDistinctValues(numbers: number[], precision = 0): number[] {
    const rounded = numbers.map(num => {
        return Math.round(num * 10 ** precision) / 10 ** precision;
    });
    const originalNoDups = new Set(numbers).size;
    const roundedNoDups = new Set(rounded).size;
    return roundedNoDups === originalNoDups ? rounded : roundNumbersToDistinctValues(numbers, precision + 1);
}

export function getSummary(event: Event): Summary {
    const currentTarget = event.currentTarget;
    const resultsWithoutRoundedOps = Object.entries(currentTarget)
        .filter(([key]) => !Number.isNaN(Number(key)))
        .map(([_, target]) => getCaseResult(target));

    const roundedOps = roundNumbersToDistinctValues(resultsWithoutRoundedOps.map(result => result.ops));
    const results = resultsWithoutRoundedOps.map((result, index) => ({
        ...result,
        ops: roundedOps[index],
    }));
    const fastestIndex = results.reduce(
        (prev, next, index) => {
            return next.ops > prev.ops ? { ops: next.ops, index } : prev;
        },
        { ops: 0, index: 0 },
    ).index;
    const slowestIndex = results.reduce(
        (prev, next, index) => {
            return next.ops < prev.ops ? { ops: next.ops, index } : prev;
        },
        { ops: Infinity, index: 0 },
    ).index;
    const resultsWithDiffs = results.map((result, index) => {
        const percentSlower =
            index === fastestIndex ? 0 : Number(((1 - result.ops / results[fastestIndex].ops) * 100).toFixed(2));

        return { ...result, percentSlower };
    });
    return {
        name: (event.currentTarget as any).name,
        date: new Date(event.timeStamp),
        results: resultsWithDiffs,
        fastest: {
            name: results[fastestIndex].name,
            index: fastestIndex,
        },
        slowest: {
            name: results[slowestIndex].name,
            index: slowestIndex,
        },
    };
}
