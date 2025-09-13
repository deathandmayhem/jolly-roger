import { format } from "winston";
import Transport from "winston-transport";
import { logger } from "../Logger";

class BrowserConsole extends Transport {
  public log(
    {
      level,
      message,
      label,
      error,
      ...rest
    }: {
      level: string;
      message: string;
      label?: string;
      error?: unknown;
      [key: string]: any;
    },
    next: () => void,
  ) {
    let selectedLevel;
    if (
      level === ("error" as const) ||
      level === ("warn" as const) ||
      level === ("info" as const) ||
      level === ("debug" as const)
    ) {
      selectedLevel = level;
    } else if (level === "verbose") {
      selectedLevel = "debug" as const;
    } else {
      // unexpected log level so just use console.log
      selectedLevel = "log" as const;
    }

    const args: [string, ...any[]] = [
      `${label ? `[${label}] ` : ""}${message}`,
    ];
    // Skip winston's symbol only keys
    const filteredMeta = Object.fromEntries(
      Object.entries(rest).filter(([key]) => typeof key === "string"),
    );
    // If there are only winston's symbol keys, skip
    if (Object.keys(filteredMeta).length > 0) {
      args.push(filteredMeta);
    }
    if (error) {
      args.push(error);
    }
    // eslint-disable-next-line no-console
    console[selectedLevel](...args);
    next();
  }
}

logger.format = format.combine(
  format.printf(({ label: labelUnknown, message }) => {
    const label = labelUnknown as string | undefined;
    return `${label ? `[${label}] ` : ""}${message}`;
  }),
);
logger.add(new BrowserConsole());
