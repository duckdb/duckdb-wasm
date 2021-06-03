import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import WasmPackPlugin from '@wasm-tool/wasm-pack-plugin';
import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function configure(params) {
    return {
        target: 'web',
        entry: {
            app: ['./src/app.tsx'],
        },
        output: {
            path: params.buildDir,
            filename: 'static/js/[name].[contenthash].js',
            chunkFilename: 'static/js/[name].[contenthash].js',
            assetModuleFilename: 'static/assets/[name].[contenthash].[ext]',
            webassemblyModuleFilename: 'static/wasm/.[hash].wasm',
            clean: true,
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.wasm'],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                    exclude: /node_modules/,
                    options: params.tsLoaderOptions,
                },
                {
                    test: /\.css$/,
                    use: [
                        params.extractCss ? MiniCssExtractPlugin.loader : 'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    compileType: 'module',
                                    mode: 'local',
                                    auto: true,
                                    exportGlobals: true,
                                    localIdentName: params.cssIdentifier,
                                    localIdentContext: path.resolve(__dirname, 'src'),
                                },
                            },
                        },
                    ],
                },
                {
                    test: /.*shell_bg\.wasm$/,
                    type: 'webassembly/async',
                },
                {
                    test: /.*duckdb(|-eh|-eh-mt)\.wasm$/,
                    type: 'javascript/auto',
                    loader: 'file-loader',
                    options: {
                        name: 'static/wasm/[contenthash].[ext]',
                    },
                },
                {
                    test: /\.(sql)$/i,
                    loader: 'file-loader',
                    options: {
                        name: 'static/scripts/[name].[contenthash].[ext]',
                    },
                },
                {
                    test: /\.(csv|tbl)$/i,
                    loader: 'file-loader',
                    options: {
                        name: 'static/csv/[name].[contenthash].[ext]',
                    },
                },
                {
                    test: /\.(parquet)$/i,
                    loader: 'file-loader',
                    options: {
                        name: 'static/parquet/[name].[contenthash].[ext]',
                    },
                },
                {
                    test: /\.(png|jpe?g|gif|svg)$/i,
                    loader: 'file-loader',
                    options: {
                        name: 'static/img/[name].[contenthash].[ext]',
                    },
                },
                {
                    test: /\.(ttf|eot|woff|woff2)$/,
                    loader: 'file-loader',
                    options: {
                        name: 'static/fonts/[name].[contenthash].[ext]',
                    },
                },
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    use: ['source-map-loader'],
                },
            ],
        },
        optimization: {
            chunkIds: 'deterministic',
            moduleIds: 'deterministic',
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    vendors: {
                        test: /[\\/]node_modules[\\/]/,
                        priority: -10,
                    },
                    default: {
                        priority: -20,
                        reuseExistingChunk: true,
                    },
                },
            },
        },
        plugins: [
            new WasmPackPlugin({
                crateDirectory: path.resolve(__dirname, 'crate'),
                args: '--log-level info',
                outDir: path.resolve(__dirname, 'crate', 'pkg'),
                outName: 'shell',
            }),
            new HtmlWebpackPlugin({
                template: './static/index.html',
                filename: './index.html',
                favicon: './static/favicon.ico',
                inject: true,
            }),
            new MiniCssExtractPlugin({
                filename: './static/css/[id].[contenthash].css',
                chunkFilename: './static/css/[id].[contenthash].css',
            }),
        ],
        experiments: {
            asyncWebAssembly: true,
        },
    };
}
