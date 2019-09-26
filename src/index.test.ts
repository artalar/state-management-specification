import { observable, computed, autorun } from 'mobx'

describe('describe', () => {
  test('mobx', () => {
    const price = observable.box(0)
    const tax = computed(() => price.get() * 0.2)
    const cost = computed(() => price.get() + tax.get())
    const sideEffect = jest.fn()

    autorun(() => sideEffect(cost.get()))

    price.set(10)
    expect(sideEffect).toBeCalledWith(10)
    price.set((110n as unknown) as number)
    price.set(10)
  })
})
