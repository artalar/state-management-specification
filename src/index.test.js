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
    const { observable, computed, autorun, configure } = require('mobx')
    configure({ disableErrorBoundaries: true })

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
    // don't work (just log the error) without
    // `configure({ disableErrorBoundaries: true })`
    // that is not default and spam warning to the console
    test(`
      should throw an error at updating
      if recalculation is throw an error`,
      () => {
        expectedCalls = expectedCalls
        expect(() => price.set(110n)).toThrow()
      }
    )

    test(`
      should not save any updates
      if any computed is throw an error`,
      () => {
        // ERROR here
        // mobx is not revert updates of observables
        // if its derived observables thrown
        expect(valuesBeforeThrow.price === price.get()).toBe(true)
      }
    )

    test(`
      should not calculate computed data
      if one of dependencies is thrown an error`,
      () => {
        expect(costCalculator).toBeCalledTimes(expectedCalls)
      }
    )

    test(`
      should save last valid result
      if one of dependencies is thrown an error`,
      () => {
        // ERROR here
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
    const { createStore, combineReducers } = require('redux')
    const { createSelector } = require('reselect')
    const store = createStore(combineReducers({
      price: (state = 0, action) => {
        if (action.type === 'UPDATE_PRICE') return action.payload
        return state
      }
    }))
    const setPrice = (price) => ({ type: 'UPDATE_PRICE', payload: price })

    const priceSelector = (state) => state.price
    const taxSelector = createSelector(
      priceSelector,
      (price) => price * TAX
    )
    const costCalculator = jest.fn((price, tax) => price + tax)
    const costSelector = createSelector(
      priceSelector,
      taxSelector,
      costCalculator
    )
    const sideEffect = jest.fn()
    let expectedCalls = 0

    const subscription = createSelector(
      costSelector,
      sideEffect
    )
    store.subscribe(() => subscription(store.getState()))

    expectedCalls++
    store.dispatch(setPrice(10))
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
      price: priceSelector(store.getState()),
      cost: costSelector(store.getState()),
    }
    test(`
      should throw an error at updating
      if recalculation is throw an error`,
      () => {
        expectedCalls = expectedCalls
        expect(() => store.dispatch(setPrice(110n))).toThrow()
      }
    )

    test(`
      should not save any updates
      if any computed is throw an error`,
      () => {
        // ERROR here
        // in redux computed (memoized selectors) values
        // calculated in subscriptions, after store updates
        expect(valuesBeforeThrow.price === priceSelector(store.getState())).toBe(true)
      }
    )

    test(`
      should not calculate computed data
      if one of dependencies is thrown an error`,
      () => {
        expect(costCalculator).toBeCalledTimes(expectedCalls)
      }
    )

    test(`
      should save last valid result
      if one of dependencies is thrown an error`,
      () => {
        // ERROR here
        // here `cost` can not recalculated
        // becouse price was saved with incompatible type
        expect(valuesBeforeThrow.cost).toBe(costSelector(store.getState()))
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

  describe('reatom', () => {
    const { createStore, declareAtom, declareAction, map, combine } = require('@reatom/core')

    const setPrice = declareAction()

    const priceAtom = declareAtom(0, on => on(setPrice, (state, payload) => payload))
    const taxAtom = map(priceAtom, price => price * TAX)
    const costCalculator = jest.fn(([price, tax]) => price + tax)
    const costAtom = map(combine([priceAtom, taxAtom]), costCalculator)
    const { subscribe, dispatch, getState } = createStore(combine([priceAtom, taxAtom, costAtom]))

    const sideEffect = jest.fn()
    let expectedCalls = 0

    expectedCalls++
    sideEffect()
    subscribe(costAtom, sideEffect)

    expectedCalls++
    dispatch(setPrice(10))
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
      price: getState(priceAtom),
      cost: getState(costAtom),
    }
    test(`
      should throw an error at updating
      if recalculation is throw an error`,
      () => {
        expectedCalls = expectedCalls
        expect(() => dispatch(setPrice(110n)).toThrow())
      }
    )

    test(`
      should not save any updates
      if any computed is throw an error`,
      () => {
        expect(valuesBeforeThrow.price === getState(priceAtom)).toBe(true)
      }
    )

    test(`
      should not calculate computed data
      if one of dependencies is thrown an error`,
      () => {
        expect(costCalculator).toBeCalledTimes(expectedCalls)
      }
    )

    test(`
      should save last valid result
      if one of dependencies is thrown an error`,
      () => {
        expect(valuesBeforeThrow.cost).toBe(getState(costAtom))
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
