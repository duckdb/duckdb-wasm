const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

module.exports = suite(
  'Custom logging - console.log',

  add('Copy with map', () => {
    ;[1, 2, 3, 4, 5].map((x) => x)
  }),

  add('Copy with slice', () => {
    ;[1, 2, 3, 4, 5].slice(0)
  }),

  cycle((result, summary) => {
    console.log(
      `Name: ${result.name}, ops: ${result.ops}, currently fastest: ${summary.fastest.name}`,
    )
  }),
  complete((summary) => {
    console.log(`Finished ${summary.results.length} benchmarks!`)
  }),
  save({ file: 'custom-logging', folder: path.join(__dirname, 'results') }),
)
