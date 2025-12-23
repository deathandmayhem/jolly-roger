import type http from "node:http";
import { WebApp } from "meteor/webapp";
import type { NextFunction } from "express";
import lookupUrl from "./lookupUrl";

// Server-side dynamic rendering of /site.webmanifest to ensure we use custom
// icon assets when provided by the server admin.

const serveSiteManifest = (
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _next: NextFunction,
) => {
  const android192Src = lookupUrl("android-chrome-192x192.png");
  const android512Src = lookupUrl("android-chrome-512x512.png");
  const manifest = {
    name: "Jolly Roger",
    short_name: "Jolly Roger",
    icons: [
      {
        src: android192Src,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: android512Src,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };
  const body = JSON.stringify(manifest);

  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.writeHead(200);
  res.end(body);
};

WebApp.handlers.use("/site.webmanifest", serveSiteManifest);
