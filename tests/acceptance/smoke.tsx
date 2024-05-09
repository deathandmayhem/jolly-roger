import { promisify } from "util";
import { Meteor } from "meteor/meteor";
import { act, render } from "@testing-library/react";
import React from "react";
import type { Location, NavigateFunction, RouteObject } from "react-router-dom";
import {
  MemoryRouter,
  Route,
  Routes as ReactRouterRoutes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import FixtureHunt from "../../imports/FixtureHunt";
import Logger from "../../imports/Logger";
import addHuntUser from "../../imports/methods/addHuntUser";
import createFixtureHunt from "../../imports/methods/createFixtureHunt";
import promoteOperator from "../../imports/methods/promoteOperator";
import provisionFirstUser from "../../imports/methods/provisionFirstUser";
import resetDatabase from "../lib/resetDatabase";
import { stabilize, USER_EMAIL, USER_PASSWORD } from "./lib";

function enumeratePaths(
  routes: RouteObject[],
  prefix = "",
  acc: string[] = [],
): string[] {
  routes.forEach((route) => {
    if (route.children) {
      enumeratePaths(route.children, `${prefix}${route.path}/`, acc);
    }
    acc.push(`${prefix}${route.path}`);
  });
  return acc;
}

if (Meteor.isClient) {
  const Routes: typeof import("../../imports/client/components/Routes").default =
    require("../../imports/client/components/Routes").default;
  const {
    AuthenticatedRouteList,
    UnauthenticatedRouteList,
  }: typeof import("../../imports/client/components/Routes") = require("../../imports/client/components/Routes");

  const location: React.MutableRefObject<Location | null> = { current: null };
  const navigate: React.MutableRefObject<NavigateFunction | null> = {
    current: null,
  };

  const LocationCapture = () => {
    location.current = useLocation();
    navigate.current = useNavigate();
    return null;
  };

  const TestApp = () => {
    return (
      <MemoryRouter>
        <Routes />
        <ReactRouterRoutes>
          <Route path="*" element={<LocationCapture />} />
        </ReactRouterRoutes>
      </MemoryRouter>
    );
  };

  const fixtureHunt = FixtureHunt._id;
  const fixturePuzzle = FixtureHunt.puzzles[0]!._id;

  describe("routes", function () {
    before(async function () {
      // Bump timeout for setup hook. It shouldn't take this long, but we see
      // timeouts in CI.
      this.timeout(5000);

      await resetDatabase("route");
      await provisionFirstUser.callPromise({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });
      await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      await createFixtureHunt.callPromise();
      await addHuntUser.callPromise({ huntId: fixtureHunt, email: USER_EMAIL });
      await promoteOperator.callPromise({
        targetUserId: Meteor.userId()!,
        huntId: fixtureHunt,
      });
    });

    afterEach(function () {
      location.current = null;
      navigate.current = null;
    });

    const substituteUrl = (path: string) => {
      const substitutions = {
        huntId: fixtureHunt,
        puzzleId: fixturePuzzle,
        userId: Meteor.userId()!,
        invitationCode: "abcdef123456",
      };

      const url = Object.entries(substitutions).reduce(
        (acc, [k, v]) => acc.replace(`:${k}`, v),
        path,
      );
      const unreplaced = new Set([...url.matchAll(/:(\w+)/g)].map((m) => m[1]));
      if (unreplaced.size > 0) {
        if (unreplaced.has("token")) {
          Logger.info("Ignoring route with :token parameter");
          unreplaced.delete("token");
        }
        if (unreplaced.size === 0) {
          Logger.info("Skipping route", { path });
          return undefined;
        }
        throw new Error(`Unknown parameters: ${[...unreplaced].join(", ")}`);
      }

      return url;
    };

    describe("which are authenticated", function () {
      before(async function () {
        await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      });

      enumeratePaths(AuthenticatedRouteList).forEach((p) => {
        it(`works for path ${p}`, async function () {
          // Bump the timeout to 5 seconds.  It probably shouldn't take this long,
          // but we've seen flakes in CI when routes (especially
          // `/hunts/:huntId/puzzles`) take over 2000 ms (the default timeout).
          this.timeout(5000);

          const url = substituteUrl(p);
          if (!url) {
            this.skip();
          }

          render(<TestApp />);
          await act(async () => {
            await stabilize();
            navigate.current!(url);
            await stabilize();
          });
        });
      });
    });

    describe("which are unauthenticated", function () {
      before(async function () {
        await promisify(Meteor.logout)();
      });

      enumeratePaths(UnauthenticatedRouteList).forEach((p) => {
        it(`works for path ${p}`, async function () {
          const url = substituteUrl(p);
          if (!url) {
            this.skip();
          }

          render(<TestApp />);
          await act(async () => {
            await stabilize();
            navigate.current!(url);
            await stabilize();
          });
        });
      });
    });
  });
}
