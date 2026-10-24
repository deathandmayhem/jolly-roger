import { cleanup, renderHook } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import useAttentionSignal from "../../../../imports/client/hooks/useAttentionSignal";
import reportAttentionTransition from "../../../../imports/methods/reportAttentionTransition";

describe("useAttentionSignal", function () {
  let clock: sinon.SinonFakeTimers;
  let reportStub: sinon.SinonStub;

  const reportedValues = () =>
    reportStub.getCalls().map((call) => call.args[0].value);

  beforeEach(function () {
    clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    reportStub = sinon.stub(reportAttentionTransition, "call");
  });

  afterEach(function () {
    cleanup();
    sinon.restore();
  });

  it("doesn't report a change that reverts within the debounce", function () {
    const { rerender } = renderHook(
      ({ value }) => useAttentionSignal("windowFocused", value, "user"),
      { initialProps: { value: true } },
    );
    rerender({ value: false });
    clock.tick(500);
    rerender({ value: true });
    clock.tick(5000);
    assert.deepEqual(reportedValues(), [true]);
  });

  it("reports a lasting change once", function () {
    const { rerender } = renderHook(
      ({ value }) => useAttentionSignal("windowFocused", value, "user"),
      { initialProps: { value: true } },
    );
    rerender({ value: false });
    clock.tick(5000);
    assert.deepEqual(reportedValues(), [true, false]);
  });

  it("reports false right away when unmounted while true", function () {
    const { unmount } = renderHook(() =>
      useAttentionSignal("iframeFocused", true, "user"),
    );
    unmount();
    assert.deepEqual(reportedValues(), [true, false]);
  });

  it("reports the current value right away for a different user", function () {
    const { rerender } = renderHook(
      ({ user }) => useAttentionSignal("windowFocused", true, user),
      { initialProps: { user: "user" } },
    );
    rerender({ user: "otherUser" });
    assert.deepEqual(reportedValues(), [true, true]);
  });
});
