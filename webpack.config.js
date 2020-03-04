const path = require('path');

module.exports = [{
    entry: {
        'dashjs': ["./src/dash.js"],
    },

    output: {
        path: path.resolve(__dirname + "/dist"),
        filename: "[name].min.js",
    },

    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: {
                loader: "babel-loader",
                options: {
                    presets: ["@babel/preset-env"]
                }
            }
        }]
    },
}];
