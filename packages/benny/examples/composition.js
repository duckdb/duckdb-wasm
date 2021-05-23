const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')
const { pipe } = require('@arrows/composition')
const A = require('@arrows/array')
const R = require('ramda')
const _ = require('lodash/fp')

// Prepare an array of 1..10
const initialArr = Array.from({ length: 100 }, (_, i) => i + 1)

// Helper functions identical for each case
const isOdd = (x) => x % 2 !== 0
const triple = (x) => x * 3
const sum = (a, b) => a + b

module.exports = suite(
  'Functional array composition',

  add('ramda', () => {
    R.pipe(
      // @ts-ignore
      R.filter(isOdd),
      R.map(triple),
      R.reduce(sum, 0),
    )(initialArr)
  }),

  add('@arrows', () => {
    pipe(
      A.filter(isOdd),
      A.map(triple),
      A.reduce(sum, 0),
    )(initialArr)
  }),

  add('lodash/fp', () => {
    _.pipe(
      _.filter(isOdd),
      _.map(triple),
      _.reduce(sum, 0),
    )(initialArr)
  }),

  cycle(),
  complete(),
  save({ file: 'composition', folder: path.join(__dirname, 'results') }),
)
