import getType from '@arrows/dispatch/getType'
import types from '@arrows/dispatch/types'
import { Suite } from 'benchmark'
import { Options } from './internal/common-types'

type SkipResult = {
  name: 'skip'
}

type Test = () => any | Test

type Deferred = {
  resolve(): void
}

const prepareCaseFn = async (test: Test) => {
  const returnType = getType(test())

  if (returnType === types.Function && getType(test()()) === types.Promise) {
    return {
      rawTest: (deferred: Deferred) => test()().then(() => deferred.resolve()),
      defer: true,
    }
  }

  if (returnType === types.Function) {
    return {
      rawTest: test(),
      defer: false,
    }
  }

  if (returnType === types.Promise) {
    const promiseContent = await test()

    if (getType(promiseContent) === types.Function) {
      const nestedReturnType = promiseContent()

      if (getType(nestedReturnType) === types.Promise) {
        return {
          rawTest: (deferred: Deferred) =>
            promiseContent().then(() => deferred.resolve()),
          defer: true,
        }
      } else {
        return {
          rawTest: promiseContent,
          defer: false,
        }
      }
    }

    return {
      rawTest: (deferred: Deferred) => test().then(() => deferred.resolve()),
      defer: true,
    }
  }

  return {
    rawTest: test,
    defer: false,
  }
}

type Add = {
  (caseName: string, test: Test, options?: Options): Promise<
    (suiteObj: Suite) => Suite
  >
  only: (
    caseName: string,
    test: Test,
    options?: Options,
  ) => Promise<(suiteObj: Suite) => Suite>
  skip: (...args: any[]) => Promise<SkipResult>
}

/**
 * Adds a benchmark case
 */
const add: Add = async (caseName, test, options = {}) => {
  const { rawTest, defer } = await prepareCaseFn(test)

  const fn = (suiteObj: Suite) => {
    suiteObj.add(caseName, rawTest, { ...options, defer })
    return suiteObj
  }

  Object.defineProperty(fn, 'name', { value: 'add' })

  return fn
}

add.only = async (caseName, test, options = {}) => {
  const fn = (suiteObj: Suite) => {
    suiteObj.add(
      caseName,
      typeof test() === 'function' ? test() : test,
      options,
    )
    return suiteObj
  }

  Object.defineProperty(fn, 'name', { value: 'only' })

  return fn
}

add.skip = (...args) => Promise.resolve({ name: 'skip' })

export { add, Add, SkipResult }
export default add
