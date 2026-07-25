import { setImmediate } from "node:timers/promises";

// Polls an assertion until it stops throwing. Once the wall-clock deadline
// passes, a final attempt runs outside the try, so the assertion's own error
// is what propagates. The default deadline stays below mocha's 2000ms test
// timeout so that error, not mocha's generic timeout, is what reports.
export default async function waitForAssertion(
  assertion: () => void,
  timeoutMs = 1500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch {
      await setImmediate();
    }
  }
  assertion();
}
