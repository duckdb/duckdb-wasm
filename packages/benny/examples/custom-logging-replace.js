const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

module.exports = suite(
  'Custom logging - console.log',

  add('Add two numbers', () => {
    1 + 1
  }),

  add('Add two numbers', () => {
    1 + 1 + 1
  }),

  add('Add two numbers', () => {
    1 + 1 + 1
  }),

  cycle((result, summary) => {
    // This will be replaced in-place by each cycle:
    return `Progress: ${
      summary.results.filter((result) => result.completed).length
    } / ${summary.results.length}`
  }),
  complete((summary) => {
    console.log(`Finished ${summary.results.length} benchmarks!`)
  }),
  save({
    file: 'custom-logging-replace',
    folder: path.join(__dirname, 'results'),
  }),
)
