const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = env => {
    return {
        // 1.为了更好的看到打包后的代码，统一设置 mode 为开发模式
        mode: "development",
        // entry: "./src/index.tsx",
        output: {
            filename: "index.js",
            path: path.resolve(__dirname, "dist"),

            // 2.指定生产模式下采用 systemjs 模块规范
            libraryTarget: env.production ? "system" : ""
        },
        // 2.5 可以不写入口 entry，默认 src/index，但是如果要支持 tsx 就要添加 extension
        resolve: {
            extensions: [".tsx", ".ts", ".jsx", ".js"],
        },
        module: {
            rules: [
                // 3.使用 babel 解析 js 文件
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
                    use: "ts-loader",
                    exclude: /node_modules/
                }
            ]
        },
        plugins: [
            // 4.生产环境不生成 html
            !env.production && new HtmlWebpackPlugin({
                template: "./public/index.html"
            })
        ].filter(Boolean),

        // 5.生产环境下不打包 react, react-dom
        externals: env.production ? ["react", "react-dom"] : []
    }
};