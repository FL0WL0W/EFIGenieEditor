const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => { return {
    optimization: {
        minimize: argv.mode === 'production',
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    keep_classnames: true, // This preserves class names
                }
            }),
        ],
    },
    entry: path.resolve(__dirname, 'src/index.js'),
    output: {
        path: path.resolve(__dirname, 'docs'),
        filename: 'main.js',
        clean: true,
    },
    devtool: 'source-map',
    performance: {
        hints: false,
        maxEntrypointSize: 10000000,
        maxAssetSize: 10000000
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, "docs")
        },
        proxy: [
            {
                context: ['/EFIGenieCommunication'],
                target: 'ws://192.168.4.1',
                ws: true, // Enable WebSocket support
                changeOrigin: true
            },
            {
                context: ['/upload'],
                target: 'ws://192.168.4.1',
            },
            {
                context: ['/config.bin'],
                target: 'ws://192.168.4.1',
            },
            {
                context: ['/config.json'],
                target: 'ws://192.168.4.1',
            },
        ],
        port: 3000,
        open: true,
        hot: true,
        compress: true
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use:[MiniCssExtractPlugin.loader, 'css-loader']
            },
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: 'svg-url-loader',
                        options: {
                            limit: 8192,
                            name: '[name].[ext]',
                            noquotes: true
                        }
                    },
                    'svgo-loader'
                ]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'app.css',
        }),
        new HtmlWebpackPlugin({
            title: 'EFIGenie Editor',
            filename: 'index.html',
            template: 'src/template.html',
        })
    ]
}}