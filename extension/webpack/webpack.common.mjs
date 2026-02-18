import { join } from "node:path";
import CopyPlugin from "copy-webpack-plugin";

const srcDir = join(import.meta.dirname, "..", "src");

export default ["chrome", "firefox"].map((browser) => {
  return {
    entry: {
      popup: join(srcDir, "popup.tsx"),
      options: join(srcDir, "options.tsx"),
    },
    output: {
      path: join(import.meta.dirname, `../dist/${browser}/js`),
      filename: "[name].js",
    },
    optimization: {
      splitChunks: {
        name: "vendor",
        chunks(chunk) {
          return chunk.name !== "background";
        },
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: ".",
            to: "../",
            context: "public",
            transform: {
              transformer(input, absoluteFilename) {
                if (!absoluteFilename.endsWith("manifest.json")) {
                  return input;
                }
                const manifest = JSON.parse(input.toString());
                if (browser === "firefox") {
                  manifest.browser_specific_settings = {
                    gecko: {
                      id: "{2bf7bc48-4f7d-4c16-9a88-58bb9f1c6ff5}",
                      strict_min_version: "128.0",
                    },
                  };
                } else {
                  manifest.minimum_chrome_version = "88";
                }
                return JSON.stringify(manifest);
              },
            },
          },
        ],
        options: {},
      }),
    ],
  };
});
