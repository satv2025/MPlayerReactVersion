// webpack.embed.config.js
const path = require("path");

module.exports = {
  entry: "./src/embed.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "SATVPlayer.js",
    library: "SATVPlayer",
    libraryTarget: "umd",
  },
  externals: {
    react: "React",
    "react-dom/client": "ReactDOM",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env", "@babel/preset-react"],
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
};