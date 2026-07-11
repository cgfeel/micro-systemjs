const isImports = (tar: unknown): tar is ImportMapType =>
  isRecord(tar) &&
  'imports' in tar &&
  isRecord(tar.imports) &&
  Object.entries(tar.imports).filter(
    ([key, val]) => typeof key !== 'string' || typeof val !== 'string'
  ).length === 0

const isRecord = (tar: unknown): tar is object => tar instanceof Object && tar !== null

class SystemJS {
  // 注册记录
  lastRegister: [string[], DeclareFnType] | [] = []

  // 映射表
  newMapURL: Record<string, string> = {}

  // 模块注册表：缓存已加载模块的导出
  moduleRegistry = new Map<string, unknown>()

  // 加载的资源这里称作 id，原则上可以是一个第三方 cdn 的 URL
  import(id: string) {
    return Promise.resolve(this._processScripts())
      .then(() => {
        // 1) 去当前路径查找对应的资源: index.js
        const lastIndex = location.href.lastIndexOf('/')
        const baseUrl = location.href.slice(0, lastIndex)

        return id.startsWith('./') ? `${baseUrl}/${id.slice(2)}` : id
      })
      .then(
        // 2) 解析目标模块（加载 → 递归解析依赖 → 执行 → 缓存导出）
        (id) => this._resolveModule(id)
      )
  }
  // 将回调的结果保存起来
  register(deps: string[], declare: DeclareFnType) {
    // 本地脚本加载后是个微任务，会先同步执行 register，之后在微任务中响应 load
    this.lastRegister = [deps, declare]
  }
  // 解析 SystemJS 模块：加载脚本 → 执行工厂 → 递归解析依赖 → execute → 返回导出
  _resolveModule(id: string): Promise<unknown> {
    const url = this.newMapURL[id] || id

    // 命中缓存直接返回
    if (this.moduleRegistry.has(url)) {
      return Promise.resolve(this.moduleRegistry.get(url))
    }

    return this._load(id).then(([deps, declare]) => {
      if (!deps || !declare) return

      let moduleExports: unknown = undefined

      // 传入真实的导出捕获函数，替代之前的 () => {}
      const { setters, execute } = declare((exports: unknown) => {
        moduleExports = exports
      })

      // 递归解析所有依赖，拿到导出后依次调用 setter 注入
      return Promise.all(
        deps.map((dep, i) => {
          return this._resolveModule(dep).then((depExports) => {
            setters[i](depExports)
          })
        })
      ).then(() => {
        // 所有依赖就绪后执行模块主体
        execute()
        // 缓存导出，后续相同 URL 直接返回
        this.moduleRegistry.set(url, moduleExports)
        return moduleExports
      })
    })
  }
  // 加载资源
  _load(id: string) {
    return new Promise<typeof this.lastRegister>((resolve) => {
      const script = document.createElement('script')
      script.src = this.newMapURL[id] || id
      script.async = true

      document.head.appendChild(script)
      script.addEventListener('load', () => {
        // 在 load 响应中取出注册的对象，在微任务中返回回去，并清空注册以便后续执行
        const register = this.lastRegister
        this.lastRegister = []

        resolve(register)
      })
    })
  }
  // 获取所有的 script 并筛选出 systemjs-importmap
  _processScripts() {
    Array.from(document.querySelectorAll('script')).forEach((script) => {
      try {
        const scriptContent =
          script.type === 'systemjs-importmap' ? JSON.parse(script.innerHTML) : null
        if (isImports(scriptContent)) {
          const { imports } = scriptContent
          Object.entries(imports).forEach(([key, value]) => {
            this.newMapURL[key] = value
          })
        }
      } catch {}
    })
  }
}

export default SystemJS

interface SystemModuleContext {
  /** 当前模块 URL string */
  url: string
  /** 动态 import() 函数，用于模块内动态导入 */
  import: (moduleSpecifier: string) => Promise<unknown>
  /** 模块元信息 import.meta */
  meta: ImportMeta
}

/** System.register factory 返回对象 */
interface SystemRegisterModuleDef {
  /**
   * 和顶层 import 数组一一对应
   * setters[n] 在依赖加载完成后执行，用来把外部模块注入本地变量
   */
  setters: Array<(moduleExports: unknown) => void>

  /**
   * 模块主体执行函数
   * SystemJS 在所有依赖 setter 执行完毕后调用 execute
   * 内部执行业务代码、调用 __WEBPACK_DYNAMIC_EXPORT__ 导出模块值
   */
  execute: () => void
}

type DeclareFnType = (
  exportFn?: WEBPACK_DYNAMIC_EXPORT,
  context?: SystemModuleContext
) => SystemRegisterModuleDef
type ImportMapType = { imports: Record<string, string> }
type WEBPACK_DYNAMIC_EXPORT = (value: unknown) => void
