const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')

const EsmWebpackPlugin = require('@purtuga/esm-webpack-plugin')

const { name } = require('./package.json')

module.exports = async env => {
  let mode, output, watch

  if (env.prod) {
    mode = 'production'

    output = {
      path: path.resolve(__dirname, '.')
    }
  }

  if (env.dev) {
    dotenv.config()

    mode = 'development'

    const { PEERTUBE_PATH } = process.env

    await fs.promises.access(PEERTUBE_PATH, fs.constants.R_OK | fs.constants.W_OK)

    output = {
      path: path.resolve(PEERTUBE_PATH, `./storage/plugins/node_modules/${name}`)
    }

    watch = true
  }

  return {
    mode,
    watch,
    entry: './client/common-client-plugin.js',
    output: {
      ...output,
      filename: 'dist/common-client-plugin.js',
      chunkFilename: 'dist/[name].js',
      library: 'script',
      libraryTarget: 'var'
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [
            // The `injectType`  option can be avoided because it is default behaviour
            { loader: 'style-loader', options: { injectType: 'styleTag' } },
            'css-loader'
          ]
        }
      ]
    },
    plugins: [
      new EsmWebpackPlugin()
    ]
  }
}
