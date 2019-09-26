const { observable, computed, autorun } = require('mobx')

console.error = e => console.log(
  'ERROR',
  e instanceof Error ? e.message : e
)

const TAX = 0.2

describe('describe', () => {
  describe('mobx', () => {
    const price = observable.box(0)
    const tax = computed(() => price.get() * TAX)
    const costCalculator = jest.fn(() => price.get() + tax.get())
    const cost = computed(costCalculator)
    const sideEffect = jest.fn()
    let expectedCalls = 0

    expectedCalls++
    autorun(() => sideEffect(cost.get()))


    expectedCalls++
    price.set(10)
    test('should recalculate one time', () => {
      expect(costCalculator).toBeCalledTimes(expectedCalls)
    })

    test('should react one time', () => {
      expect(sideEffect).toBeCalledTimes(expectedCalls)
    })

    const valuesBeforeThrow = {
      price: price.get(),
      cost: cost.get(),
    }
    test('should throw an error', () => {
      expectedCalls = expectedCalls
      // mobx here just log the error
      expect(() => price.set(110n)).toThrow()
    })

    test('should not save updates at thrown dispatch', () => {
      // mobx is not revert updates of observables
      // if its derived observables thrown
      expect(valuesBeforeThrow.price).toBe(price.get())
    })

    test('should not calculate computed data if one of dependencies thrown', () => {
      // here `cost` can not recalculated
      // becouse price was saved with incompatible type
      expect(valuesBeforeThrow.cost).toBe(cost.get())
    })

    test('should not react after thrown dispatch', () => {
      expect(sideEffect).toBeCalledTimes(expectedCalls)
    })
  })
})
