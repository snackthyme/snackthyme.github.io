const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },

  module: {
    rules: [
      {
        test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/
      }
    ]
  },

  mode: 'none',
  devtool: 'eval-source-map'
};
