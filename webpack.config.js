const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineSVGPlugin = require("html-webpack-inline-svg-plugin")

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'src/index.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js'
    },
    devtool: 'source-map',
    performance: {
        hints: false,
        maxEntrypointSize: 10000000,
        maxAssetSize: 10000000
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, "dist")
        },
        port: 3000,
        open: true,
        hot: true,
        compress: true
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'EFIGenie Editor',
            filename: 'index.html',
            template: 'src/template.html',
        }),
        new HtmlWebpackInlineSVGPlugin({
          runPreEmit: true,
        }),
    ]
}