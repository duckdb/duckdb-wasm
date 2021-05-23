const { add, cycle, suite } = require('benny')

const testManySizes = (...sizes) =>
  sizes.map((size) => {
    return add(`Raw JS ${size} elements`, () => {
      const input = Array.from({ length: size }, (_, i) => i)

      return () => input.reduce((a, b) => a + b)
    })
  })

module.exports = suite(
  'Reduce',

  ...testManySizes(10, 1000, 1000000),

  cycle(),
)
