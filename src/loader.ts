const createScript = () => document.createElement('script')
const loadScript = (url: string) =>
  new Promise((resolve, reject) => {
    const script = createScript()
    script.src = url
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error(`Failed to load: ${url}`))
    document.head.append(script)
  })

const bootstrap = () =>
  loadScript(process.env.APP_NAME === 'system-custom' ? './custom-system.js' : './system.js')
    .then(() => {
      const importMap = createScript()
      importMap.type = 'systemjs-importmap'
      importMap.textContent = JSON.stringify({
        imports: {
          react: './react.js',
          'react-dom': './react-dom.js',
        },
      })

      document.head.appendChild(importMap)
      return System.import('./index.js')
    })
    .then(() => {
      console.log('模块加载完毕')
    })
    .catch(() => {
      console.error('模块加载失败')
    })

bootstrap()
export {}

declare const System: {
  import(id: string): Promise<void>
}
