const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

const delay = (seconds) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))

module.exports = () =>
  suite(
    'Async 2',

    add('Async example 2a', async () => {
      await delay(0.3)
    }),

    add('Async example 2b', async () => {
      await delay(0.1)
    }),

    cycle(),
    complete(),
    save({ file: 'async-2', folder: path.join(__dirname, '../results') }),
  )
