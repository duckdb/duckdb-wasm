import kleur from 'kleur';
import { Event, Suite } from 'benchmark';
import { Summary, SuiteModifier } from './types';
import { getSummary } from './summary';

function defaultComplete(summary: Summary): void {
    const length = summary.results.length;
    console.log(kleur.blue(`\nFinished ${length} case${length !== 1 ? 's' : ''}!`));
    if (length > 1) {
        console.log(kleur.blue('  Fastest:'), summary.fastest.name);
        console.log(kleur.blue('  Slowest:'), summary.slowest.name);
    }
}

export async function complete(fn = defaultComplete): Promise<SuiteModifier> {
    return (suite: Suite): Suite => {
        suite.on('complete', (event: Event) => fn(getSummary(event)));
        return suite;
    };
}
