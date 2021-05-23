const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

module.exports = suite(
  'Multiplying',

  add('Multiple two numbers', () => {
    2 * 2
  }),

  add('Multiply three numbers', () => {
    2 * 2 * 2
  }),

  cycle(),
  complete(),
  save({ file: 'multiplying', folder: path.join(__dirname, '../results') }),
)
