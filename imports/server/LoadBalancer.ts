import type { IncomingMessage, ServerResponse } from "node:http";
import type stream from "node:stream";
import { WebApp } from "meteor/webapp";
import type HttpProxy from "http-proxy-3";
import type { ProxyTarget } from "http-proxy-3";
import type WorkerPool from "./WorkerPool";
import type { Worker } from "./WorkerPool";

// This implements a simple multi-process, single-machine load-balancer.
//
// It serves as a drop-in replacement for the relevant subset of the
// `meteorhacks:cluster` package we used (which was mostly just "load balance
// across a pool of processes, so we can use all the cores on a machine").
//
// The coordinator runs in the main process, and may spawn several worker
// processes (which will have behavior modulated by having CLUSTER_WORKER_ID set
// in their environment).
//
// The coordinator intercepts HTTP and Websocket requests, and may dispatch them
// to worker processes over `child_process` messaging.
//
// If CLUSTER_WORKERS_COUNT is set in the environment, it spawns that many child
// processes, or if set to "auto", spawns as many children as the machine has
// CPUs.
//
// Otherwise, it spawns no children, and the listeners simply propagate the
// requests as middleware usually do, which causes the requests to be serviced
// from the main process.
export default class LoadBalancer {
  proxy: HttpProxy;

  workers: WorkerPool;

  workerMapping: Record<string, { worker: Worker; lastUpdate: number }>;

  constructor(proxy: HttpProxy, workers: WorkerPool) {
    this.proxy = proxy;
    this.workers = workers;
    this.workerMapping = {};
  }

  httpHandler(): (req: IncomingMessage, res: ServerResponse) => boolean {
    const proxy = this.proxy;
    const workers = this.workers;
    const workerMapping = this.workerMapping;
    const handleHttp = function (
      req: IncomingMessage,
      res: ServerResponse,
    ): boolean {
      // Only intercept if we're the coordinator process.  If we have a worker ID,
      // we're not the coordinator.
      if (process.env.CLUSTER_WORKER_ID) {
        return false;
      }

      // Only intercept sockjs HTTP requests.
      const longPollingMatcher = /^\/sockjs\/([0-9]+)\/(\w+)\/xhr/;
      const match = req.url?.match(longPollingMatcher);
      if (!match) {
        // Do not send other HTTP requests to workers.
        return false;
      }

      // We are the coordinator.  Select a worker and dispatch the request.
      // We want to have the same backend servicing requests from the same client, so
      // we aim to pick a consistent worker for a given sockjs connection string.
      const id = `${match[1]}${match[2]}`;
      if (!workerMapping[id]) {
        const worker = workers.pickWorker();
        if (worker) {
          workerMapping[id] = { worker, lastUpdate: Date.now() };
        }
      }

      // If there's still no worker, that means the pool is empty.  Just continue
      // middleware propagation.
      if (!workerMapping[id]) {
        return false;
      }

      workerMapping[id].lastUpdate = Date.now();
      // This eventually gets passed to `http.request`, and `socketPath` is
      // only valid if `host` and `port` are unset (regardless of what the
      // http-proxy-3 types demand)
      const target = {
        socketPath: workerMapping[id].worker.path,
      } as ProxyTarget;
      // Set long timeout because clients long-poll
      res.setTimeout(2 * 60 * 1000);
      // Proxy the request.  On failure, clean up the worker mapping, so we try
      // a different worker.
      proxy.web(req, res, { target }, () => {
        delete workerMapping[id];
      });
      return true;
    };
    return handleHttp;
  }

  wsHandler(): (req: IncomingMessage, socket: any, head: Buffer) => boolean {
    const workers = this.workers;
    const handleWs = function (
      req: IncomingMessage,
      socket: any,
      head: Buffer,
    ): boolean {
      // Only intercept if we're the coordinator process.  If we have a worker ID,
      // we're not the coordinator.
      if (process.env.CLUSTER_WORKER_ID) {
        return false;
      }

      const worker = workers?.pickWorker();
      // If we couldn't find a usable worker, just service the request from the main
      // process
      if (!worker) return false;

      // Otherwise, dispatch the request to the worker
      worker.process.send(
        {
          type: "proxy-ws",
          req: {
            readable: req.readable,
            domain: (req as any).domain,
            httpVersion: req.httpVersion,
            complete: req.complete,
            headers: req.headers,
            trailers: req.trailers,
            _pendings: (req as any)._pendings,
            _pendingIndex: (req as any)._pendingIndex,
            url: req.url,
            method: req.method,
            statusCode: req.statusCode,
            _consuming: (req as any)._consuming,
            _dumped: (req as any)._dumped,
            httpVersionMajor: req.httpVersionMajor,
            httpVersionMinor: req.httpVersionMinor,
            upgrade: (req as any).upgrade,
          },
          head: head.toString("utf8"),
        },
        socket,
      );
      return true;
    };
    return handleWs;
  }

  installHttp() {
    const event = "request";
    const httpServer = WebApp.httpServer;
    const oldHttpServerListeners = httpServer.listeners(event).slice(0);
    httpServer.removeAllListeners(event);

    const httpHandler = this.httpHandler();
    const newListener = function (req: IncomingMessage, res: ServerResponse) {
      if (httpHandler.apply(httpServer, [req, res]) !== true) {
        oldHttpServerListeners.forEach((oldListener) => {
          oldListener.apply(httpServer, [req, res]);
        });
      }
    };
    httpServer.addListener(event, newListener);
  }

  installWs() {
    const event = "upgrade";
    const httpServer = WebApp.httpServer;
    const oldHttpServerListeners = httpServer.listeners(event).slice(0);
    httpServer.removeAllListeners(event);

    const wsHandler = this.wsHandler();
    const newListener = function (
      req: IncomingMessage,
      socket: stream.Duplex,
      head: Buffer,
    ) {
      if (wsHandler.apply(httpServer, [req, socket, head]) !== true) {
        oldHttpServerListeners.forEach((oldListener) => {
          oldListener.apply(httpServer, [req, socket, head]);
        });
      }
    };
    httpServer.addListener(event, newListener);
  }

  install() {
    this.installHttp();
    this.installWs();
  }
}
