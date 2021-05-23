import { Event, Suite } from 'benchmark'
import * as kleur from 'kleur'
import { Summary } from './internal/common-types'
import getSummary from './internal/getSummary'

type CompleteFn = (summary: Summary) => any

const defaultComplete: CompleteFn = (summary) => {
  const length = summary.results.length

  console.log(
    kleur.blue(`\nFinished ${length} case${length !== 1 ? 's' : ''}!`),
  )

  if (length > 1) {
    console.log(kleur.blue('  Fastest:'), summary.fastest.name)
    console.log(kleur.blue('  Slowest:'), summary.slowest.name)
  }
}

type Complete = (fn?: CompleteFn) => Promise<(suiteObj: Suite) => Suite>

/**
 * Handles complete event
 */
const complete: Complete = async (fn = defaultComplete) => (suiteObj) => {
  suiteObj.on('complete', (event: Event) => fn(getSummary(event)))
  return suiteObj
}

export { complete, Complete }
export default complete
