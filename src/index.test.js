// reducing console output
console.error = e => console.log(
  'ERROR',
  e instanceof Error ? e.message : e
)

const TAX = 0.2

// simple example thats may scale
// to horrible bugs at large application
describe('recalculations and exceptions', () => {
  describe('mobx', () => {
    const { observable, computed, autorun } = require('mobx')

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

  describe('redux', () => {
    const { createStore } = require('redux')
    const store = createStore((_, { payload }) => payload, 0)
    const updatePrice = (price) => ({ type: 'UPDATE_PRICE', payload: price})

    const taxSelector = () => store.getState() * TAX;
    store.subscribe(taxSelector)

    const costSelector = () => store.getState() + taxSelector();
    const costCalculator = jest.fn(() => costSelector())
    store.subscribe(costCalculator)

    const sideEffect = jest.fn()
    let expectedCalls = 0

    expectedCalls++
    costCalculator();
    store.subscribe(() => sideEffect(costCalculator()))

    expectedCalls++
    store.dispatch(updatePrice(10))
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
      price: store.getState(),
      cost: costSelector(),
    }
    test(`
      should throw an error at updating
      if recalculate throwns`,
      () => {
        expectedCalls = expectedCalls
        expect(() => store.dispatch(updatePrice(110n)).toThrow())
      }
    )

    test(`
      should not save any updates
      if any dependeny throw an error`,
      () => {
        expect(valuesBeforeThrow.price).toBe(store.getState())
      }
    )

    test(`
      should not calculate computed data
      if one of dependencies thrown
      (and save last valid result)`,
      () => {
        // here `cost` can not recalculated
        // becouse price was saved with incompatible type
        expect(valuesBeforeThrow.cost).toBe(costCalculator())
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
