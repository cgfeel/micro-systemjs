import SystemJS from './SystemJS'

const system = new SystemJS()
Reflect.defineProperty(window, 'System', {
  value: system,
  enumerable: false,
  configurable: false,
  writable: false,
})

export default system
