# micro-systemjs

一个 `SystemJS` 原理演示，完整内容查看微前端主仓库：https://github.com/cgfeel/zf-micro-app

---

## 示例

### `SystemJS` 使用和复现

运行环境：`Webpack` + `Typescript` + `React` (不重要，换成 `Vue` 也是一样的)

**`Webpack` 打包总结：** [[查看配置](https://github.com/cgfeel/micro-systemjs/blob/main/webpack.config.js)]

- `mode: development`，方便查看打包后的文件
- `externals: ["react", "react-dom"]`，分离依赖的框架
- `libraryTarget: "system"` 最终编译为 `index.js` 放置在 `dist`

**`index.js` 编译后的文件概览：** [[查看](https://github.com/cgfeel/micro-systemjs/blob/main/dist/index.js)]

- 由 `System.register` 完成注册，接受 2 个参数，第一个是依赖，这里是 `["react","react-dom"]`
- 第二个是加载回调函数，有 2 个参数 [[见文件注释](https://github.com/cgfeel/micro-systemjs/blob/main/dist/index.html#L44)]，返回一个对象，包含：
  - `setters`：记录加载模块的数组对象，顺序和加载依赖数组一致
  - `execute`：全部加载完毕后执行方法进行渲染

**手写两个 html 了解 `systemjs`：**

运行方式：直接点击 html 在浏览器中查看演示，不需要启动服务

1. 通过 `systemjs` 加载应用和对应的逻辑，完成渲染

文件：`./systemjs/dist/systemjs.html` [[查看](https://github.com/cgfeel/micro-systemjs/blob/main/dist/systemjs.html)]

**分 3 个部分：**

- 类型 `type="systemjs-importmap"` 的 `script` 作为依赖源码地址，这里全部采用 `umd` 模式
- `SystemJS` 源码包 `system.min.js`
- `System.import("./index.js")` 导入打包后的文件

2.  复现 `systemjs`

文件：`./systemjs/dist/index.html` [[查看](https://github.com/cgfeel/micro-systemjs/blob/main/dist/index.html)]

使用微任务的方式，通过 `script` 加载所需的依赖，分 4 个微任务加载：

1. 提取 `type="systemjs-importmap"` 中的资源作一张映射表，计算引入的包路径，方便后续资源加载
2. 加载本地编译后的包：`index.js`
   - 由于加载过程是一个微任务，所以 `script` 加载完成后，在下一个微任务前会立即执行 `System.register`
   - 将 `System.register` 提供的 2 个参数存起来，待微任务后续使用
3. 继续下一个微任务，分别拿到依赖项加载映射表资源
   - 按照 `index.js` 依赖顺序将加载的资源，
   - 通过 `getLastGlobalProperty` 对比加载前后的快照提取新增的模块
   - 分别将模块提供给回调方法返回的 `setters` 中对应的方法
4. 最后执行回调方法放回的 `execute` 完成渲染，并释放快照 `set`

至此整个 `systemjs` 已完成；和课程内容不同的是，为了尽可能还原 `SystemJS`，将加载方法和对象全部放在了 `Class SystemJS` 中 [[查看](https://github.com/cgfeel/micro-systemjs/blob/main/dist/index.html)]
