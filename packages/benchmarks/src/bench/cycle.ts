import kleur from 'kleur';
import { Event, Suite } from 'benchmark';
import { CaseResult, CaseResultWithDiff, SuiteModifier, Summary } from './types';
import { format } from './format';
import { getCaseResult } from './result';
import { getSummary } from './summary';

export function getStatus(
    item: CaseResultWithDiff,
    index: number,
    summary: Summary,
    ops: string,
    fastestOps: string,
): string {
    const isFastest = index === summary.fastest.index;
    const isSlowest = index === summary.slowest.index;
    const statusShift = fastestOps.length - ops.length + 2;
    return (
        ' '.repeat(statusShift) +
        (isFastest
            ? kleur.green('| fastest')
            : isSlowest
            ? kleur.red(`| slowest, ${item.percentSlower}% slower`)
            : kleur.yellow(`| ${item.percentSlower}% slower`))
    );
}

function defaultCycle(result: CaseResult, summary: Summary): void {
    const allCompleted = summary.results.every(item => item.samples > 0);
    const fastestOps = format(summary.results[summary.fastest.index].ops);
    const progress = Math.round((summary.results.filter(r => r.samples !== 0).length / summary.results.length) * 100);
    const progressInfo = `Progress: ${progress}%`;
    const output = summary.results
        .map((item, index) => {
            const ops = format(item.ops);
            const margin = item.margin.toFixed(2);
            return item.samples
                ? kleur.cyan(`\n  ${item.name}:\n`) +
                      `    ${ops} ops/s, ±${margin}% ${
                          allCompleted ? getStatus(item, index, summary, ops, fastestOps) : ''
                      }`
                : null;
        })
        .filter(item => item !== null)
        .join('\n');
    console.log(`${progressInfo}\n${output}`);
}

export async function cycle(fn = defaultCycle): Promise<SuiteModifier> {
    return (suite: Suite): Suite => {
        suite.on('cycle', (event: Event) => {
            const summary = getSummary(event);
            const current = getCaseResult(event);
            fn(current, summary);
        });
        return suite;
    };
}
