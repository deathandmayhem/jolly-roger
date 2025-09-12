/* eslint-disable camelcase */
import child_process from "child_process";
import { WebApp } from "meteor/webapp";
import portscanner from "portscanner";
import Logger from "../Logger";

type HandledSignal = "SIGINT" | "SIGHUP" | "SIGTERM";

export type Worker = {
  process: child_process.ChildProcess;
  id: number;
  port: number;
};

type ProxyWsMessage = {
  type: "proxy-ws";
  req: object; // It's a bunch of fields that I don't currently care to lay out
  head: string;
};

// worker processes should notify their parent once they're ready to accept
// requests
if (process.env.CLUSTER_WORKER_ID) {
  WebApp.onListening(() => {
    if (process.send) {
      process.send({
        type: "ready",
      });
    }
  });

  process.on("message", (message: unknown, socket) => {
    if (typeof message === "object" && message !== null && "type" in message) {
      if (message.type === "proxy-ws") {
        const wsmessage = message as ProxyWsMessage;
        WebApp.httpServer.emit(
          "upgrade",
          wsmessage.req,
          socket,
          Buffer.from(wsmessage.head, "utf8"),
        );
      }
    }
  });
}

export default class WorkerPool {
  exec: string;

  args: string[];

  workers: Worker[];

  workersMap: Record<number, Worker>;

  ids: number;

  closed: boolean;

  recentReconnects: number;

  lastReconnectAt: number;

  static create(size: number): WorkerPool | undefined {
    if (process.env.CLUSTER_WORKER_ID) {
      return undefined;
    }
    return new WorkerPool(size);
  }

  constructor(size: number) {
    this.exec = process.argv[1]!;
    this.args = process.argv.slice(2);
    this.workers = [];
    this.workersMap = {};
    this.ids = 0;
    this.closed = false;
    for (let i = 0; i < size; i++) {
      this.createWorker();
    }
    this.recentReconnects = 0;
    this.lastReconnectAt = 0;

    (["SIGINT", "SIGHUP", "SIGTERM"] as const).forEach(
      (signal: HandledSignal) => {
        process.once(signal, this.cleanup.bind(this));
      },
    );
  }

  createWorker() {
    this.fork((worker) => {
      Logger.info("Multiprocess: worker starting on port", {
        workerId: worker.id,
        port: worker.port,
      });

      const registerWorker = (message: any) => {
        if (message && message.type === "ready") {
          this.workers.push(worker);
          this.workersMap[worker.id] = worker;

          process.removeListener("message", registerWorker);
        }
      };

      worker.process.on("message", registerWorker);
      worker.process.once("exit", (exitCode, signalCode) => {
        Logger.info("Multiprocess: worker exiting", {
          worker: worker.id,
          exitCode,
          signalCode,
        });

        const index = this.workers.indexOf(worker);
        if (index >= 0) {
          this.workers.splice(index, 1);
          delete this.workersMap[worker.id];
        }
        if (!this.closed) {
          const reconnectTimeout = this.getReconnectTimeout();
          if (reconnectTimeout === 0) {
            this.createWorker();
          } else {
            setTimeout(this.createWorker.bind(this), reconnectTimeout);
          }
        }
      });
    });
  }

  getReconnectTimeout(): number {
    const now = Date.now();
    const timeDiff = now - this.lastReconnectAt;
    const oneMinute = 1000 * 60;
    if (timeDiff > oneMinute) {
      this.recentReconnects = 0;
    }

    const reconnectTime = this.recentReconnects * 500;
    this.recentReconnects += 1;
    this.lastReconnectAt = now;
    return reconnectTime;
  }

  fork(callback: (w: Worker) => void) {
    const id = this.ids;
    this.ids += 1;

    const firstPort = Math.ceil(Math.random() * 20000) + 2000;
    const secondPort = firstPort + 1;

    const withPort = (error: Error | null, port: number) => {
      if (error) throw error;
      const env = {
        ...process.env,
        PORT: `${port}`,
        CLUSTER_WORKER_ID: `${id}`,
      };
      const child = child_process.fork(this.exec, this.args, {
        env,
        silent: false,
      });
      const worker = {
        process: child,
        id,
        port,
      };

      callback(worker);
    };

    portscanner.findAPortNotInUse(firstPort, secondPort, "127.0.0.1", withPort);
  }

  cleanup(signal: NodeJS.Signals) {
    this.closed = true;
    this.workers.forEach((worker) => {
      worker.process.kill(signal);
    });
    process.kill(process.pid, signal);
  }

  pickWorker(): Worker | undefined {
    const workerCount = this.workers.length;
    if (!workerCount) return undefined;
    const index = Math.floor(workerCount * Math.random());
    const worker = this.workers[index]!;
    return {
      id: worker.id,
      port: worker.port,
      process: worker.process,
    };
  }
}
