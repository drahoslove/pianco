imodule.exports = {
  entry: {
		main: './js/main.js',
  },
  output: {
		filename: '[name]-bundle.js',
		path: __dirname,
	},
	module: {
		rules: [
			{ test: /\.js$/, use: 'babel-loader' },
		]
	},
	plugins: [
  ]
};