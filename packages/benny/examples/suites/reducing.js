const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

module.exports = suite(
  'Reducing',

  add('Reduce two elements', () => {
    ;[1, 2].reduce((a, b) => a + b)
  }),

  add('Reduce five elements', () => {
    ;[1, 2, 3, 4, 5].reduce((a, b) => a + b)
  }),

  cycle(),
  complete(),
  save({ file: 'reducing', folder: path.join(__dirname, '../results') }),
)
