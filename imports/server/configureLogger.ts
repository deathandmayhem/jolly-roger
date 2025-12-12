import util from "node:util";
import { Meteor } from "meteor/meteor";
import logfmt from "logfmt";
import { format, transports } from "winston";
import { logger } from "../Logger";
import { serverId } from "./garbage-collection";
import { workersCount } from "./loadBalance";

const userIdSymbol = Symbol("userId");

declare module "logform" {
  interface TransformableInfo {
    [userIdSymbol]?: string | null;
  }
}

logger.format = format.combine(
  format.colorize({ level: true }),
  format((info) => {
    try {
      const userId = Meteor.userId();
      return { ...info, [userIdSymbol]: userId };
    } catch {
      return info;
    }
  })(),
  format.printf(
    ({
      level,
      label: labelUnknown,
      message,
      [userIdSymbol]: userId,
      error,
      ...rest
    }) => {
      const label = labelUnknown as string | undefined;
      const ctx: string[] = [];
      if (workersCount > 1) {
        ctx.push(`s:${serverId}`);
      }
      if (userId) {
        ctx.push(`u:${userId}`);
      }
      return `${level}: ${ctx.length > 0 ? `[${ctx.join("|")}] ` : ""}${
        label ? `[${label}] ` : ""
      }${message}${
        Object.keys(rest).length > 0 ? `: ${logfmt.stringify(rest)}` : ""
      }${error ? `: ${util.inspect(error)}` : ""}`;
    },
  ),
);
logger.add(new transports.Console());
