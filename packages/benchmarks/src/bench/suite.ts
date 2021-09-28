import { Event, Suite } from 'benchmark';
import kleur from 'kleur';
import { AsyncSuiteModifier, Summary } from './types';
import { getSummary } from './summary';

export async function suite(name: string, ...fns: AsyncSuiteModifier[]): Promise<Summary> {
    const unpackedFns = await Promise.all([...fns]);
    let s = new Suite(name).on('start', () => {
        console.log(kleur.blue(`Running "${name}" suite...`));
    });
    const items = unpackedFns;
    for (const item of items) {
        s = item(s);
    }

    return new Promise((resolve, reject) => {
        s.on('complete', (event: Event) => resolve(getSummary(event)))
            .on('error', reject)
            .run();
    });
}
