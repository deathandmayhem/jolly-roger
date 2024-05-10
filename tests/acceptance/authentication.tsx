import { promisify } from "util";
import { Meteor } from "meteor/meteor";
import { render, cleanup } from "@testing-library/react";
import { assert } from "chai";
import React, { act } from "react";
import type { Location, NavigateFunction } from "react-router-dom";
import {
  MemoryRouter,
  Route,
  useLocation,
  Routes as ReactRouterRoutes,
  useNavigate,
} from "react-router-dom";
import provisionFirstUser from "../../imports/methods/provisionFirstUser";
import resetDatabase from "../lib/resetDatabase";
import { stabilize, USER_EMAIL, USER_PASSWORD } from "./lib";

if (Meteor.isClient) {
  const Routes: typeof import("../../imports/client/components/Routes").default =
    require("../../imports/client/components/Routes").default;

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

  describe("authentication", function () {
    afterEach(function () {
      cleanup();
      location.current = null;
      navigate.current = null;
    });

    describe("no users", function () {
      before(async function () {
        await resetDatabase("authentication no users");
      });

      it("redirects to the create-first-user page", async function () {
        render(<TestApp />);
        await act(async () => {
          await stabilize();
        });
        assert.equal(location.current?.pathname, "/create-first-user");
      });
    });

    describe("has users but not logged in", function () {
      before(async function () {
        await resetDatabase("authentication has users but not logged in");
        await provisionFirstUser.callPromise({
          email: USER_EMAIL,
          password: USER_PASSWORD,
        });
      });

      it("redirects to the login page", async function () {
        render(<TestApp />);
        await act(async () => {
          await stabilize();
        });
        assert.equal(
          location.current?.pathname,
          "/login",
          "redirects to login from root",
        );

        // Attempt to go to a specific authenticated page
        await act(async () => {
          navigate.current!("/hunts");
          await stabilize();
        });
        assert.equal(
          location.current?.pathname,
          "/login",
          "redirects to login from authenticated page",
        );
      });
    });

    describe("authenticated users", function () {
      before(async function () {
        await resetDatabase("authenticated users");
        await provisionFirstUser.callPromise({
          email: USER_EMAIL,
          password: USER_PASSWORD,
        });
        await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      });

      it("redirects away from the login page", async function () {
        render(<TestApp />);
        await act(async () => {
          await stabilize();
          navigate.current!("/login");
          await stabilize();
        });
        assert.equal(location.current?.pathname, "/hunts");
      });

      it("does not redirect away from an authenticated page", async function () {
        render(<TestApp />);
        await act(async () => {
          await stabilize();
          navigate.current!("/hunts");
          await stabilize();
        });
        assert.equal(location.current?.pathname, "/hunts");
      });
    });
  });
}
