const { add, complete, cycle, save, suite } = require('benny')
const Immutable = require('immutable')
const { produce } = require('immer')
const { transform, transformAt } = require('transmutable')
const clone = require('clone')
const cloneDeep = require('clone-deep')
const cloneRFDC = require('rfdc')()
const path = require('path')
const _ = require('lodash')

const initializeTestData = () => ({
  foo: {
    bar: {
      baz: 'elo',
      bat: [1, 2, 3],
    },
  },
  batman: 'NaNNaNNaNNaN',
})

module.exports = suite(
  'Immutable transformations',

  add('Pure JS', () => {
    const data = initializeTestData()

    return () => {
      const newData = {
        ...data,
        foo: {
          bar: {
            baz: 'yo',
            bat: data.foo.bar.bat.map((x, i) => (i === 1 ? 7 : x)),
          },
        },
      }
    }
  }),

  add('Immer', () => {
    const data = initializeTestData()

    return () => {
      const newData = produce(data, (draft) => {
        draft.foo.bar.baz = 'yo'
        draft.foo.bar.bat[1] = 7
      })
    }
  }),

  add('Transmutable', () => {
    const data = initializeTestData()

    return () => {
      const newData = transform((draft) => {
        draft.foo.bar.baz = 'yo'
        draft.foo.bar.bat[1] = 7
      }, data)
    }
  }),

  add('Immutable.js', () => {
    const data = Immutable.fromJS(initializeTestData())

    return () => {
      const newData = data
        .setIn(['foo', 'bar', 'baz'], 'yo')
        .setIn(['foo', 'bar', 'bat', 1], 7)
        .toJS()
    }
  }),

  add('Clone - RFDC', () => {
    const data = initializeTestData()

    return () => {
      const newData = cloneRFDC(data)
      newData.foo.bar.baz = 'yo'
      newData.foo.bar.bat[1] = 7
    }
  }),

  add('Clone - clone', () => {
    const data = initializeTestData()

    return () => {
      const newData = clone(data)
      newData.foo.bar.baz = 'yo'
      newData.foo.bar.bat[1] = 7
    }
  }),

  add('Clone - clone-deep', () => {
    const data = initializeTestData()

    return () => {
      const newData = cloneDeep(data)
      newData.foo.bar.baz = 'yo'
      newData.foo.bar.bat[1] = 7
    }
  }),

  add('Clone - lodash', () => {
    const data = initializeTestData()

    return () => {
      const newData = _.cloneDeep(data)
      newData.foo.bar.baz = 'yo'
      newData.foo.bar.bat[1] = 7
    }
  }),

  cycle(),
  complete(),
  save({ file: 'immutable-trans', folder: path.join(__dirname, 'results') }),
  save({
    file: 'immutable-trans',
    folder: path.join(__dirname, 'results'),
    format: 'chart.html',
  }),
)
