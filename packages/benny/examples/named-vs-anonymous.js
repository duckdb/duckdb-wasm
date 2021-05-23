const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

module.exports = suite(
  'Using named vs crating anonymous function',

  add('Named function', () => {
    function fn(x) {
      return x ** 2
    }

    return () => fn(Math.random())
  }),

  add('Named arrow function', () => {
    const fn = (x) => {
      return x ** 2
    }

    return () => fn(Math.random())
  }),

  add('Creating anonymous function each time', () => {
    ;(function(x) {
      return x ** 2
    })(Math.random())
  }),

  add('Creating anonymous arrow function each time', () => {
    ;((x) => {
      return x ** 2
    })(Math.random())
  }),

  cycle(),
  complete(),
  save({ file: 'named-vs-anonymous', folder: path.join(__dirname, 'results') }),
)
