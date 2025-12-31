import * as Sentry from "@sentry/node";
import addRuntimeConfig from "./addRuntimeConfig";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
  });

  addRuntimeConfig(() => {
    return { sentryDsn: dsn };
  });
}
