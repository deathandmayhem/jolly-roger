import { promisify } from "node:util";
import { Meteor } from "meteor/meteor";
import { Tracker } from "meteor/tracker";
import { act, cleanup, render } from "@testing-library/react";
import { assert } from "chai";
import type React from "react";
import type { NavigateFunction } from "react-router";
import {
  MemoryRouter,
  Routes as ReactRouterRoutes,
  Route,
  useNavigate,
} from "react-router";
import sinon from "sinon";
import FixtureHunt from "../../imports/FixtureHunt";
import addHuntUser from "../../imports/methods/addHuntUser";
import createFixtureHunt from "../../imports/methods/createFixtureHunt";
import provisionFirstUser from "../../imports/methods/provisionFirstUser";
import reportAttentionContext from "../../imports/methods/reportAttentionContext";
import reportAttentionTransition from "../../imports/methods/reportAttentionTransition";
import setFeatureFlag from "../../imports/methods/setFeatureFlag";
import TypedMethod from "../../imports/methods/TypedMethod";
import resetDatabase from "../lib/resetDatabase";
import { stabilize, USER_EMAIL, USER_PASSWORD } from "./lib";

// A no-op round trip. On reconnect, Meteor's login resumption blocks other
// methods from running, so waiting for this method to return lets us block
// until the reconnect completes.
const barrier = new TypedMethod<void, void>(
  "test.methods.attentionReportingBarrier",
);

if (Meteor.isServer) {
  const defineMethod: typeof import("../../imports/server/methods/defineMethod").default =
    require("../../imports/server/methods/defineMethod").default;
  defineMethod(barrier, {
    async run() {
      // no-op
    },
  });
}

if (Meteor.isClient) {
  const Routes: typeof import("../../imports/client/components/Routes").default =
    require("../../imports/client/components/Routes").default;
  const {
    default: AttentionReporter,
    useAttentionReady,
  }: typeof import("../../imports/client/components/AttentionReporter") =
    require("../../imports/client/components/AttentionReporter");
  const useAttentionSignal: typeof import("../../imports/client/hooks/useAttentionSignal").default =
    require("../../imports/client/hooks/useAttentionSignal").default;

  const navigate: React.RefObject<NavigateFunction | null> = {
    current: null,
  };

  const NavigateCapture = () => {
    navigate.current = useNavigate();
    return null;
  };

  const TestApp = () => {
    return (
      <MemoryRouter>
        <Routes />
        <ReactRouterRoutes>
          <Route path="*" element={<NavigateCapture />} />
        </ReactRouterRoutes>
      </MemoryRouter>
    );
  };

  const afterFlush = () =>
    new Promise<void>((resolve) => {
      Tracker.afterFlush(resolve);
    });

  const visit = async (url: string) => {
    await act(async () => {
      await stabilize();
      await navigate.current!(url);
      await stabilize();
    });
  };

  const setReportingDisabled = async (disabled: boolean) => {
    await act(async () => {
      await setFeatureFlag.callPromise({
        name: "disable.attention_reporting",
        type: disabled ? "on" : "off",
      });
      await afterFlush();
    });
  };

  const fixtureHunt = FixtureHunt._id;
  const fixturePuzzle = FixtureHunt.puzzles[0]!._id;
  const puzzleUrl = `/hunts/${fixtureHunt}/puzzles/${fixturePuzzle}`;

  describe("attention reporting", function () {
    this.timeout(10000);

    let callSpy: sinon.SinonSpy;

    const contextReports = () =>
      callSpy
        .getCalls()
        .filter((call) => call.args[0] === reportAttentionContext.name)
        .map((call) => {
          const { huntId, puzzleId } = call.args[1];
          return { huntId, puzzleId };
        });

    const lastContextReport = () => contextReports().at(-1);

    // Context reports and signal names, in the order they were sent
    const reports = () =>
      callSpy.getCalls().flatMap((call) => {
        if (call.args[0] === reportAttentionContext.name) {
          return ["context"];
        }
        if (call.args[0] === reportAttentionTransition.name) {
          return [call.args[1].signal];
        }
        return [];
      });

    before(async function () {
      await resetDatabase("attention reporting");
      await provisionFirstUser.callPromise({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });
      await promisify(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      await createFixtureHunt.callPromise();
      await addHuntUser.callPromise({ huntId: fixtureHunt, email: USER_EMAIL });
    });

    after(async function () {
      await promisify(Meteor.logout)();
    });

    beforeEach(function () {
      callSpy = sinon.spy(Meteor, "call");
    });

    afterEach(function () {
      cleanup();
      sinon.restore();
      navigate.current = null;
    });

    it("reports the current page's hunt and puzzle", async function () {
      render(<TestApp />);

      await visit(puzzleUrl);
      assert.deepEqual(lastContextReport(), {
        huntId: fixtureHunt,
        puzzleId: fixturePuzzle,
      });

      await visit(`/hunts/${fixtureHunt}/puzzles`);
      assert.deepEqual(lastContextReport(), {
        huntId: fixtureHunt,
        puzzleId: undefined,
      });

      await visit("/users");
      assert.deepEqual(lastContextReport(), {
        huntId: undefined,
        puzzleId: undefined,
      });
    });

    it("reports a descendant's signals after the context", function () {
      const SignalProbe = () => {
        useAttentionSignal("iframeFocused", true, useAttentionReady());
        return null;
      };
      render(
        <MemoryRouter>
          <AttentionReporter>
            <SignalProbe />
          </AttentionReporter>
        </MemoryRouter>,
      );

      const sent = reports();
      assert.equal(sent[0], "context");
      assert.sameMembers(sent.slice(1), [
        "iframeFocused",
        "tabVisible",
        "windowFocused",
      ]);
    });

    it("reports again after a reconnect", async function () {
      render(<TestApp />);
      await visit(puzzleUrl);
      const reportsBefore = reports().length;

      // Separate acts, so React renders the disconnected state before the
      // reconnect
      await act(async () => {
        Meteor.disconnect();
        await afterFlush();
      });
      await act(async () => {
        Meteor.reconnect();
        await barrier.callPromise();
        await afterFlush();
      });

      const sent = reports().slice(reportsBefore);
      assert.equal(sent[0], "context");
      assert.includeMembers(sent, ["tabVisible", "windowFocused"]);
      assert.deepEqual(lastContextReport(), {
        huntId: fixtureHunt,
        puzzleId: fixturePuzzle,
      });
    });

    it("pauses reporting while the circuit breaker is on", async function () {
      render(<TestApp />);
      await visit(puzzleUrl);

      await setReportingDisabled(true);
      const reportsBefore = reports().length;
      await visit(`/hunts/${fixtureHunt}/puzzles`);
      assert.lengthOf(reports(), reportsBefore);

      await setReportingDisabled(false);
      const sent = reports().slice(reportsBefore);
      assert.equal(sent[0], "context");
      assert.includeMembers(sent, ["tabVisible", "windowFocused"]);
      assert.deepEqual(lastContextReport(), {
        huntId: fixtureHunt,
        puzzleId: undefined,
      });
    });
  });
}
