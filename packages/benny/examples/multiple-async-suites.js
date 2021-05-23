const asyncSuite1 = require('./suites/async1')
const asyncSuite2 = require('./suites/async2')

;(async () => {
  await asyncSuite1()
  await asyncSuite2()
})()
