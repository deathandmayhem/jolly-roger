import http from "node:http";
import os from "node:os";
import { WebApp } from "meteor/webapp";
import HttpProxy from "http-proxy-3";
import LoadBalancer from "./LoadBalancer";
import WorkerPool from "./WorkerPool";

// This implements a simple multi-process, single-machine load-balancer.
//
// It serves as a drop-in replacement for the relevant subset of the
// `meteorhacks:cluster` package we used (which was mostly just "load balance
// across a pool of processes, so we can use all the cores on a machine").
//
// The LoadBalancer runs in the main process, and may spawn several worker
// processes (which have their behavior modulated by having CLUSTER_WORKER_ID
// set in their environment).
//
// The LoadBalancer intercepts HTTP and Websocket requests, and may dispatch
// them to the WorkerPool worker processes over `child_process` messaging.
//
// If CLUSTER_WORKERS_COUNT is set in the environment, it spawns that many child
// processes, or if set to "auto", spawns as many children as the machine has
// CPUs.
//
// Otherwise, we skip all the load-balancing logic and just service the requests
// from the main process as usual.
const getWorkersCount = () => {
  const maybeWorkerCountString = process.env.CLUSTER_WORKERS_COUNT;
  if (`${maybeWorkerCountString}`.toLowerCase() === "auto") {
    const cpuCount = os.cpus().length;
    if (cpuCount === 1) {
      // No need to start a separate worker if we're only running 1
      return 0;
    }
    return cpuCount;
  }

  if (maybeWorkerCountString === undefined) return 0;
  return parseInt(maybeWorkerCountString, 10) || 0;
};

export const workersCount = getWorkersCount();

WebApp.onListening(() => {
  if (workersCount > 0) {
    http.globalAgent.maxSockets = 99999;
    const proxy = HttpProxy.createProxyServer({
      xfwd: true,
    });
    const workers = WorkerPool.create(workersCount);
    if (workers) {
      const loadBalancer = new LoadBalancer(proxy, workers);
      loadBalancer.install();
    }
  }
});
