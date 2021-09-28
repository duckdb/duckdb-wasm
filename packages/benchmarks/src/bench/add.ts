import { Suite } from 'benchmark';
import { Options, SuiteModifier } from './types';

type AsyncTest = () => Promise<any>;
type BlockingTest = () => void;

type Deferred = {
    resolve(): void;
};

export async function addAsync(caseName: string, test: AsyncTest, options: Options = {}): Promise<SuiteModifier> {
    const deferredTest = (deferred: Deferred) => test().then(() => deferred.resolve());
    const defer = true;
    const fn = (suite: Suite) => {
        suite.add(caseName, deferredTest, { ...options, defer });
        return suite;
    };
    Object.defineProperty(fn, 'name', { value: 'add' });
    return fn;
}

export async function addBlocking(caseName: string, test: BlockingTest, options: Options = {}): Promise<SuiteModifier> {
    const fn = (suite: Suite) => {
        suite.add(caseName, test, { ...options, defer: false });
        return suite;
    };
    Object.defineProperty(fn, 'name', { value: 'add' });
    return fn;
}
