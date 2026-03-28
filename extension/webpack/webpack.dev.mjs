import { merge } from "webpack-merge";
import common from "./webpack.common.mjs";

export default common.map((browserConfig) => {
  return merge(browserConfig, {
    devtool: "inline-source-map",
    mode: "development",
  });
});
