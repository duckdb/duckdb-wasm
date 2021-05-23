import { Event, Suite } from 'benchmark'
import * as fs from 'fs-extra'
import * as kleur from 'kleur'
import * as path from 'path'
import { SaveOptions, Summary } from './internal/common-types'
import getSummary from './internal/getSummary'
import prepareFileContent from './internal/prepareFileContent'

type Opt = SaveOptions & { folder: string }

const defaultOptions: Opt = {
  file: (summary) => summary.date.toISOString(),
  folder: 'benchmark/results',
  version: null,
  details: false,
  format: 'json',
}

type Save = (options?: SaveOptions) => Promise<(suiteObj: Suite) => Suite>

/**
 * Saves results to a file
 */
const save: Save = async (options = {}) => (suiteObj) => {
  const opt = { ...defaultOptions, ...options } as Opt

  suiteObj.on('complete', (event: Event) => {
    const summary: Summary = getSummary(event)

    const fileName =
      typeof opt.file === 'function' ? opt.file(summary) : opt.file
    const fullPath = path.join(opt.folder, `${fileName}.${opt.format}`)

    const fileContent = prepareFileContent(summary, opt)

    fs.ensureDirSync(opt.folder)

    fs.writeFileSync(fullPath, fileContent)

    console.log(kleur.cyan(`\nSaved to: ${fullPath}`))
  })

  return suiteObj
}

export { save, Save }
export default save
