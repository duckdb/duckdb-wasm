const { add, complete, cycle, save, suite } = require('benny')
const _ = require('lodash/fp')
const R = require('ramda')
const A = require('@arrows/array')
const RB = require('rambda')

const input = Array.from({ length: 100 }, (_, i) => i)

module.exports = suite(
  'Reduce implementations comparison',

  add('lodash/fp', () => {
    _.reduce((a, b) => a + b, 0)(input)
  }),

  add('ramda', () => {
    R.reduce((a, b) => a + b, 0)(input)
  }),

  add('@arrows/array', () => {
    A.reduce((a, b) => a + b, 0)(input)
  }),

  add('@arrows/array first', () => {
    A.reduce.first((a, b) => a + b)(input)
  }),

  add('rambda', () => {
    RB.reduce((a, b) => a + b, 0)(input)
  }),

  cycle(),
  complete(),
  save({ file: 'reduce' }),
  save({ file: 'reduce', format: 'chart.html' }),
)
