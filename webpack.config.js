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
        path: path.resolve(__dirname, 'dist'),
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
            directory: path.resolve(__dirname, "dist")
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
                target: 'http://192.168.4.1',
            },
            {
                context: ['/config.bin'],
                target: 'http://192.168.4.1',
            },
            {
                context: ['/config.json'],
                target: 'http://192.168.4.1',
            },
            {
                context: ['/command/reset'],
                target: 'http://192.168.4.1',
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
                test: /config.json$/,
                type: 'asset/resource',
                generator: {
                    filename: '[name][ext]'
                }
            },
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
                    {
                        loader: 'svgo-loader',
                        options: {
                            plugins: [
                                'preset-default',
                                'mergePaths',
                                'removeViewBox',
                                'minifyStyles',
                                'cleanupAttrs', 
                                'removeDoctype', 
                                'removeXMLProcInst', 
                                'removeComments', 
                                'removeMetadata', 
                                'removeTitle', 
                                'removeDesc',  
                                'removeEditorsNSData', 
                                'removeEmptyAttrs', 
                                'removeHiddenElems', 
                                'removeEmptyText', 
                                'removeEmptyContainers', 
                                'convertStyleToAttrs', 
                                'convertColors', 
                                'removeNonInheritableGroupAttrs', 
                                'cleanupNumericValues', 
                                'cleanupListOfValues', 
                                'moveElemsAttrsToGroup', 
                                'collapseGroups',
                                'removeUselessDefs',
                                'convertPathData',
                                'convertTransform',
                                'removeUnknownsAndDefaults',
                                'removeUselessStrokeAndFill',
                                'removeUnusedNS',
                                'moveGroupAttrsToElems',
                                'convertShapeToPath',
                                {
                                    name: 'removeAttrs',
                                    params: {
                                        attrs: "(id)"
                                    }
                                }
                            ],
                            "multipass": true
                        }
                    }
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