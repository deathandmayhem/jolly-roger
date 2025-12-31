import { Meteor } from "meteor/meteor";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

if (__meteor_runtime_config__.sentryDsn) {
  Sentry.init({
    dsn: __meteor_runtime_config__.sentryDsn,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: 1.0,
    release: Meteor.gitCommitHash,
    environment: Meteor.isDevelopment ? "development" : "production",
  });
}
