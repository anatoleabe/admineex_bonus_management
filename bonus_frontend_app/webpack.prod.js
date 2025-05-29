/**
 * Production build configuration for Bonus Management Frontend
 * 
 * This file contains Angular production build settings and optimizations
 */

const webpack = require('webpack');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  output: {
    // Output hashed filenames for better caching
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js'
  },
  optimization: {
    // Enable optimizations
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            pure_funcs: ['console.debug', 'console.log', 'console.info']
          },
          output: {
            comments: false // Remove comments
          }
        },
        extractComments: false
      })
    ],
    splitChunks: {
      // Split code into chunks
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // Get the name of the npm package
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            // Return a chunk name based on npm package name
            return `vendor.${packageName.replace('@', '')}`;
          }
        }
      }
    },
    runtimeChunk: 'single' // Create a single runtime bundle
  },
  plugins: [
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.PRODUCTION': JSON.stringify(true)
    }),
    // Compress assets
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240, // Only compress files > 10kb
      minRatio: 0.8 // Only compress if compression ratio is better than 0.8
    })
  ],
  performance: {
    // Set performance hints
    hints: 'warning',
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000 // 500kb
  }
};
