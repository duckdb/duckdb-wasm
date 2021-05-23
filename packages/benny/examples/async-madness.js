const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

const delay = (seconds) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))

module.exports = suite(
  'Async madness',

  add('Async benchmark without setup', async () => {
    // You can use await or return - works the same,
    // (async function always returns a Promise)
    await delay(0.5) // Resulting in 2 ops/s
  }),

  add('Async benchmark without setup - many async operations', async () => {
    await delay(0.5)
    await delay(0.5)
    // Resulting in 1 ops/s
  }),

  add('Async benchmark with some setup', async () => {
    await delay(2) // Setup can be async, it will not affect the results

    return async () => {
      await delay(0.5) // Still 2 ops/s
    }
  }),

  add('Sync benchmark with some async setup', async () => {
    await delay(2) // Setup can be async, it will not affect the results

    return () => {
      1 + 1 // High ops, not affected by slow, async setup
    }
  }),

  cycle(),
  complete(),
  save({ file: 'async-madness', folder: path.join(__dirname, 'results') }),
)
