const { observable, computed, autorun } = require('mobx')

// reducing console output
console.error = e => console.log(
  'ERROR',
  e instanceof Error ? e.message : e
)

const TAX = 0.2

// simple example thats may scale
// to harible bugs at large application
describe('recalculations and exceptions', () => {
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
    test(`
      should recalculate one time
      even if updating 2 dependenies`,
      () => {
        expect(costCalculator).toBeCalledTimes(expectedCalls)
      }
    )

    test(`
      should react one time
      even if updating 2 dependenies`,
      () => {
        expect(sideEffect).toBeCalledTimes(expectedCalls)
      }
    )

    const valuesBeforeThrow = {
      price: price.get(),
      cost: cost.get(),
    }
    test(`
      should throw an error at updating
      if recalculate throwns`,
      () => {
        expectedCalls = expectedCalls
        // mobx here just log the error
        expect(() => price.set(110n)).toThrow()
      }
    )

    test(`
      should not save any updates
      if any dependeny throw an error`,
      () => {
        // mobx is not revert updates of observables
        // if its derived observables thrown
        expect(valuesBeforeThrow.price).toBe(price.get())
      }
    )

    test(`
      should not calculate computed data
      if one of dependencies thrown
      (and save last valid result)`,
      () => {
        // here `cost` can not recalculated
        // becouse price was saved with incompatible type
        expect(valuesBeforeThrow.cost).toBe(cost.get())
      }
    )

    test(`
      should not react
      if updating proccess has thrown`,
      () => {
        expect(sideEffect).toBeCalledTimes(expectedCalls)
      }
    )
  })
})
