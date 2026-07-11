const { HtmlWebpackPlugin, copyPlugin, defineEnvPlugin, loader } = require("@event-chat/micro-dev-config/helpers");
const path = require('path')

const distPath = path.resolve(__dirname, 'dist')
const extensions = [".tsx", ".ts", ".jsx", ".js"]

// 共用 babel/ts 规则
const rules = [
    {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: { 
            loader: "babel-loader",
            options: {
                presets: [
                    "@babel/preset-env",
                    "@babel/preset-react"
                ],
                plugins: [
                    ["@babel/plugin-transform-runtime"]
                ],
            }
        }
    },
    // 3.5 对于 ts 先用 ts-load 转换之后再交给 babel
    {
        test: /\.tsx?$/,
        use: {
            loader: loader("ts-loader")
        },
        exclude: /node_modules/
    }
]

const baseConfig = {
    mode: 'development',
    resolve: { extensions },
    module: { rules }
}

const reactSystemConfig = {
    mode: 'development',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        library: { type: 'system' }
    }
}

const buildLoader = (APP_NAME, BASE_URL = '/') => ({
    ...baseConfig,
    name: 'loader',
    entry: APP_NAME === 'system-custom' ? {
        base: './src/BaseApp.tsx',
        'custom-build': './src/loader.ts'
    } : {
        base: './src/BaseApp.tsx',
        build: './src/loader.ts'
    },
    output: {
        filename: '[name].js',
        path: distPath
    },
    plugins: [
        defineEnvPlugin({}, { APP_NAME }),
        APP_NAME === 'system-custom' && copyPlugin([
            {
                from: path.resolve(__dirname, 'public'),
                noErrorOnMissing: true,
                globOptions: {
                    ignore: ['**/index.html']
                },
            },
            {
                from: require.resolve('systemjs/dist/system.min.js'),
                to: 'system.js'
            }
        ]),
        new HtmlWebpackPlugin({
            chunks: APP_NAME === 'system-custom' ? ['base', 'custom-build'] : ['base', 'build'],
            filename: APP_NAME === 'system-custom' ? 'custom.html' : 'index.html',
            title: APP_NAME === 'system-custom' ? 'SystemJS - 基座页面' : '复现 SystemJS - 基座页面',
            template: "./public/index.html",
            templateParameters: { BASE_URL }
        })
    ].filter(Boolean)
})

module.exports = env => [
    // ======== 构建 React ========
    {
        ...reactSystemConfig,
        entry: {
            react: 'react'
        }
    },
    {
        ...reactSystemConfig,
        entry: {
            'react-dom': 'react-dom'
        },
        externals: ['react']
    },
    {
        ...baseConfig,
        entry: "./src/facade.ts",
        output: {
            filename: 'custom-system.js'
            // facade 中通过 Reflect 设置对象不可重写，避免冲突
            // library: {
            //     type: 'window',
            //     name: 'System'
            // }
        }
    },
    // ======== 构建 A：业务代码 → dist/index.js ========
    {
        ...baseConfig,
        name: 'app',
        entry: './src/index.tsx',
        output: {
            filename: 'index.js',
            path: distPath,
            libraryTarget: 'system'
        },
        externals: ['react', 'react-dom']
    },
    // ======== 构建 B：loader + HTML + 复制静态依赖 ========
    buildLoader('system-origin', env.production ? "/micro-single-spa-app/" : "/"),
    buildLoader('system-custom', env.production ? "/micro-single-spa-app/" : "/")
]