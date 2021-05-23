const { add, cycle, suite } = require('benny')
const A = require('@arrows/array')
const R = require('ramda')
const _ = require('lodash/fp')

const input = Array.from({ length: 100 }, (_, i) => i)

const testManyImplementations = (...cases) =>
  cases.map(([name, fn]) => {
    return add(name, () => {
      fn((a, b) => a + b, 0)(input)
    })
  })

module.exports = suite(
  'Reduce',

  ...testManyImplementations(
    ['Ramda', R.reduce],
    ['Arrows', A.reduce],
    ['Lodash', _.reduce],
  ),

  cycle(),
)
