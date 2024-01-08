import Bugsnag from "@bugsnag/js";
import { createLogger } from "winston";
import Transport from "winston-transport";

class BugsnagTransport extends Transport {
  public declare levels: Record<string, number>;

  public log(
    {
      level,
      message,
      userId: _userId,
      error,
      ...rest
    }: {
      level: string;
      message: string;
      userId?: string;
      error?: unknown;
      [key: string]: any;
    },
    next: () => void = () => {
      /* noop */
    },
  ) {
    if (!Bugsnag.isStarted()) return;
    if (!error || !(error instanceof Error)) return;

    Bugsnag.notify(
      error,
      (event) => {
        event.context = message;

        if (this.levels[level]! <= this.levels.error!) {
          event.severity = "error";
        } else if (this.levels[level]! <= this.levels.warn!) {
          event.severity = "warning";
        } else {
          event.severity = "info";
        }

        event.addMetadata("extra", rest);
      },
      next,
    );
  }
}

const logger = createLogger({
  level: "verbose",
  transports: [new BugsnagTransport({ level: "warn" })],
});

export { logger };

const log = function (
  level: string,
  message: string,
  opts: {
    error?: unknown /* allow error to be unknown since that's what gets caught */;
    [key: string]: any;
  } = {},
) {
  logger.log(level, message, opts);
};

export default {
  log,
  error: log.bind(null, "error"),
  warn: log.bind(null, "warn"),
  info: log.bind(null, "info"),
  verbose: log.bind(null, "verbose"),
  debug: log.bind(null, "debug"),
};
