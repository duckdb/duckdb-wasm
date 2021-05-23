const { add, complete, cycle, save, suite } = require('benny')
const path = require('path')

function allEqualImperative(arr) {
  const first = arr[0]

  for (const item of arr) {
    if (item !== first) {
      return false
    }
  }
  return true
}

function allEqualEveryDeclarative(arr) {
  const first = arr[0]
  return arr.every((item) => item === first)
}

const inputHundred = [...'a'.repeat(100)]
const inputMillion = [...'a'.repeat(1000000)]

suite(
  'All equal - hundred elements',

  add('Imperative', () => {
    allEqualImperative(inputHundred)
  }),

  add('Declarative', () => {
    allEqualEveryDeclarative(inputHundred)
  }),

  cycle(),
  complete(),
  save({ file: 'all-equal-hundred', folder: path.join(__dirname, 'results') }),
  save({
    file: 'all-equal-hundred',
    folder: path.join(__dirname, 'results'),
    format: 'chart.html',
  }),
)

suite(
  'All equal - million elements',

  add('Imperative', () => {
    allEqualImperative(inputMillion)
  }),

  add('Declarative', () => {
    allEqualEveryDeclarative(inputMillion)
  }),

  cycle(),
  complete(),
  save({ file: 'all-equal-million', folder: path.join(__dirname, 'results') }),
  save({
    file: 'all-equal-million',
    folder: path.join(__dirname, 'results'),
    format: 'chart.html',
  }),
)
