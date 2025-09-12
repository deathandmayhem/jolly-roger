import type http from "http";
import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import type { NextFunction } from "express";
import lookupUrl from "./lookupUrl";

// Server-side dynamic rendering of /browserconfig.xml to ensure we use custom
// icon assets when provided by the server admin.

const serveBrowserConfig = (
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _next: NextFunction,
) => {
  const msTileSrc = lookupUrl("mstile-150x150.png");
  const body =
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    "<browserconfig>\n" +
    "    <msapplication>\n" +
    "        <tile>\n" +
    `            <square150x150logo src="${msTileSrc}"/>\n` +
    "            <TileColor>#000000</TileColor>\n" +
    "        </tile>\n" +
    "    </msapplication>\n" +
    "</browserconfig>\n";

  res.setHeader("Content-Type", "application");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.writeHead(200);
  res.end(body);
};

WebApp.handlers.use(
  "/browserconfig.xml",
  Meteor.bindEnvironment(serveBrowserConfig),
);
