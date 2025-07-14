const path = require("path");

module.exports = {
  entry: "./src/embed.js",
  output: {
    path: path.resolve(__dirname, "public/build"),  // acá va 'public/build'
    filename: "SATVPlayer.js",
    library: "SATVPlayer",
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