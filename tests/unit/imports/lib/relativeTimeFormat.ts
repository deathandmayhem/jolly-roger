import { assert } from "chai";

import type { RelativeTimeFormatOpts } from "../../../../imports/lib/relativeTimeFormat";
import { complete } from "../../../../imports/lib/relativeTimeFormat";

const verifyFormat = (
  date: Date,
  now: Date,
  opts: Omit<RelativeTimeFormatOpts, "now">,
  expected: string,
) => {
  const { formatted, millisUntilChange } = complete(date, { ...opts, now });
  assert.equal(formatted, expected);
  assert.notEqual(
    millisUntilChange,
    0,
    "millisUntilChange should never be zero",
  );
  const justBefore = new Date(now.getTime() + millisUntilChange - 1);
  assert.equal(
    complete(date, { ...opts, now: justBefore }).formatted,
    expected,
  );
  const justAfter = new Date(now.getTime() + millisUntilChange);
  assert.notEqual(
    complete(justAfter, { ...opts, now: justAfter }).formatted,
    expected,
  );
};

describe("relativeTimeFormat", function () {
  it("formats correctly with single item", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 9)),
      now,
      {},
      "1 second ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 8)),
      now,
      {},
      "2 seconds ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 11)),
      now,
      {},
      "59 seconds ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 10)),
      now,
      {},
      "1 minute ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      {},
      "1 minute ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      {},
      "2 minutes ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      {},
      "59 minutes ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      {},
      "1 hour ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      {},
      "1 hour ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      {},
      "2 hours ago",
    );
  });

  it("formats correctly with multiple items", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 9)),
      now,
      { maxElements: -1 },
      "1 second ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 8)),
      now,
      { maxElements: -1 },
      "2 seconds ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 11)),
      now,
      { maxElements: -1 },
      "59 seconds ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 10)),
      now,
      { maxElements: -1 },
      "1 minute ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      { maxElements: -1 },
      "1 minute, 30 seconds ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      { maxElements: -1 },
      "2 minutes ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      { maxElements: -1 },
      "59 minutes, 59 seconds ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      { maxElements: -1 },
      "1 hour ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      { maxElements: -1 },
      "1 hour, 30 minutes ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      { maxElements: -1 },
      "2 hours ago",
    );

    verifyFormat(
      new Date(Date.UTC(2020, 7, 1, 18, 20, 40)),
      now,
      { maxElements: -1 },
      "1 year, 193 days, 3 hours, 34 minutes, 30 seconds ago",
    );
  });

  it("formats correctly with a minimum unit", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1 minute ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "2 minutes ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "59 minutes ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1 hour ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1 hour, 30 minutes ago",
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "2 hours ago",
    );

    verifyFormat(
      new Date(Date.UTC(2020, 7, 1, 18, 20, 40)),
      now,
      { maxElements: -1, minimumUnit: "day" },
      "1 year, 193 days ago",
    );
  });
});
