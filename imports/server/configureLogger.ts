import util from 'util';
import { Meteor } from 'meteor/meteor';
import logfmt from 'logfmt';
import { format, transports } from 'winston';
import { logger } from '../Logger';

logger.format = format.combine(
  format.colorize({ level: true }),
  format((info) => {
    try {
      const userId = Meteor.userId();
      return { ...info, userId };
    } catch {
      return info;
    }
  })(),
  format.printf(({
    level, label, message, userId, error,
    ...rest
  }) => {
    return `${level}: ${
      userId ? `[${userId}] ` : ''
    }${
      label ? `[${label}] ` : ''
    }${message}${
      Object.keys(rest).length > 0 ? `: ${logfmt.stringify(rest)}` : ''
    }${
      error ? `: ${util.inspect(error)}` : ''
    }`;
  })
);
logger.add(new transports.Console());
