const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

const delay = (seconds) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))

module.exports = () =>
  suite(
    'Async 1',

    add('Async example 1a', async () => {
      await delay(0.2)
    }),

    add('Async example 1b', async () => {
      await delay(0.05)
    }),

    cycle(),
    complete(),
    save({ file: 'async-1', folder: path.join(__dirname, '../results') }),
  )
