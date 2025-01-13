const webpack = require('webpack');

module.exports = {
    webpack: {
        configure: {
            resolve: {
                fallback: {
                    "stream": require.resolve("stream-browserify"),
                    "crypto": require.resolve("crypto-browserify"),
                    "buffer": require.resolve("buffer/"),
                    "process": require.resolve("process/browser.js"),  // Note the .js extension
                    "zlib": require.resolve("browserify-zlib"),
                    "path": require.resolve("path-browserify"),
                    "http": require.resolve("stream-http"),
                    "https": require.resolve("https-browserify"),
                    "os": require.resolve("os-browserify/browser"),
                    "assert": require.resolve("assert/"),
                    "url": require.resolve("url/"),
                    "util": require.resolve("util/")
                }
            }
        },
        plugins: [
            new webpack.ProvidePlugin({
                process: 'process/browser.js',  // Note the .js extension
                Buffer: ['buffer', 'Buffer']
            })
        ]
    }
}