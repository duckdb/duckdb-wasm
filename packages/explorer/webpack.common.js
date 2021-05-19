import { fileURLToPath } from 'url';
import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function configure(params) {
    return {
        target: ['web'],
        entry: {
            app: ['./src/app.tsx'],
        },
        output: {
            path: params.buildDir,
            publicPath: '/',
            filename: 'static/js/[name].[contenthash].js',
            chunkFilename: 'static/js/[name].[contenthash].js',
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
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
                    test: /\.(png|jpe?g|gif|svg|csv|parquet)$/i,
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
                    test: /.*\.wasm$/,
                    type: 'javascript/auto',
                    loader: 'file-loader',
                    options: {
                        name: 'static/wasm/[contenthash].[ext]',
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
            new CleanWebpackPlugin({
                verbose: false,
            }),
            new HtmlWebpackPlugin({
                template: './static/index.html',
                filename: './index.html',
                favicon: './static/favicon.ico',
            }),
            new MiniCssExtractPlugin({
                filename: './static/css/[id].[contenthash].css',
                chunkFilename: './static/css/[id].[contenthash].css',
            }),
            new webpack.DefinePlugin({
                // Referenced by react-flow...
                'process.env.FORCE_SIMILAR_INSTEAD_OF_MAP': JSON.stringify(process.env.FORCE_SIMILAR_INSTEAD_OF_MAP),
            }),
        ],
    };
}
