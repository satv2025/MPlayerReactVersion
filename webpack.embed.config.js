const path = require("path");

module.exports = {
  entry: {
    SATVPlayer: "./src/SATVPlayer.jsx",
    EpisodesButton: "./src/EpisodesButton.jsx", // el entry para solo el botón
  },
  output: {
    path: path.resolve(__dirname, "public/build"),
    filename: "[name].js",          // genera SATVPlayer.js y EpisodesButton.js
    library: "[name]",              // exporta como global con el mismo nombre
    libraryTarget: "umd",
    globalObject: "this",
  },
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env", "@babel/preset-react"],
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
};