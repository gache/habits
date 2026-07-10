import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver, but recharts' ResponsiveContainer
// constructs one on mount and would otherwise throw in every test that
// renders a chart.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver)
