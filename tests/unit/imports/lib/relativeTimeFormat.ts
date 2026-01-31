import { assert } from "chai";
import type { TFunction } from "i18next";
import i18next from "i18next";
import type { RelativeTimeFormatOpts } from "../../../../imports/lib/relativeTimeFormat";
import { complete } from "../../../../imports/lib/relativeTimeFormat";
import en from "../../../../imports/locales/en.json" with { type: "json" };
import zh from "../../../../imports/locales/zh.json" with { type: "json" };

function initTestI18n(language: string) {
  const newInstance = i18next.createInstance();
  return newInstance.init({
    lng: language,
    debug: false,
    resources: {
      en: {
        translation: en,
      },
      zh: {
        translation: zh,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });
}

const verifyFormat = (
  date: Date,
  now: Date,
  opts: Omit<RelativeTimeFormatOpts, "now">,
  expected: string,
  t: TFunction,
) => {
  const { formatted, millisUntilChange } = complete(date, t, { ...opts, now });
  assert.equal(formatted, expected);
  assert.notEqual(
    millisUntilChange,
    0,
    "millisUntilChange should never be zero",
  );
  const justBefore = new Date(now.getTime() + millisUntilChange - 1);
  assert.equal(
    complete(date, t, { ...opts, now: justBefore }).formatted,
    expected,
  );
  const justAfter = new Date(now.getTime() + millisUntilChange);
  assert.notEqual(
    complete(justAfter, t, { ...opts, now: justAfter }).formatted,
    expected,
  );
};

describe("relativeTimeFormat", function () {
  const language = "en";
  let t: TFunction;
  this.beforeAll(async function () {
    t = await initTestI18n(language);
  });
  it("formats correctly with single item", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 9)),
      now,
      {},
      "1 second ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 8)),
      now,
      {},
      "2 seconds ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 11)),
      now,
      {},
      "59 seconds ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 10)),
      now,
      {},
      "1 minute ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      {},
      "1 minute ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      {},
      "2 minutes ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      {},
      "59 minutes ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      {},
      "1 hour ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      {},
      "1 hour ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      {},
      "2 hours ago",
      t,
    );
  });

  it("formats correctly with multiple items", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 9)),
      now,
      { maxElements: -1 },
      "1 second ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 8)),
      now,
      { maxElements: -1 },
      "2 seconds ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 11)),
      now,
      { maxElements: -1 },
      "59 seconds ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 10)),
      now,
      { maxElements: -1 },
      "1 minute ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      { maxElements: -1 },
      "1 minute, 30 seconds ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      { maxElements: -1 },
      "2 minutes ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      { maxElements: -1 },
      "59 minutes, 59 seconds ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      { maxElements: -1 },
      "1 hour ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      { maxElements: -1 },
      "1 hour, 30 minutes ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      { maxElements: -1 },
      "2 hours ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2020, 7, 1, 18, 20, 40)),
      now,
      { maxElements: -1 },
      "1 year, 193 days, 3 hours, 34 minutes, 30 seconds ago",
      t,
    );
  });

  it("formats correctly with a minimum unit", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1 minute ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "2 minutes ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "59 minutes ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1 hour ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1 hour, 30 minutes ago",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "2 hours ago",
      t,
    );

    verifyFormat(
      new Date(Date.UTC(2020, 7, 1, 18, 20, 40)),
      now,
      { maxElements: -1, minimumUnit: "day" },
      "1 year, 193 days ago",
      t,
    );
  });
});

describe("relativeTimeFormat_zh", function () {
  const language = "zh";
  let t: TFunction;
  this.beforeAll(async function () {
    t = await initTestI18n(language);
  });
  it("formats correctly with single item (zh)", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 9)),
      now,
      {},
      "1秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 8)),
      now,
      {},
      "2秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 11)),
      now,
      {},
      "59秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 10)),
      now,
      {},
      "1分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      {},
      "1分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      {},
      "2分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      {},
      "59分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      {},
      "1小时前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      {},
      "1小时前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      {},
      "2小时前",
      t,
    );
  });

  it("formats correctly with multiple items (zh)", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 9)),
      now,
      { maxElements: -1 },
      "1秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 55, 8)),
      now,
      { maxElements: -1 },
      "2秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 11)),
      now,
      { maxElements: -1 },
      "59秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 54, 10)),
      now,
      { maxElements: -1 },
      "1分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      { maxElements: -1 },
      "1分钟30秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      { maxElements: -1 },
      "2分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      { maxElements: -1 },
      "59分钟59秒前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      { maxElements: -1 },
      "1小时前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      { maxElements: -1 },
      "1小时30分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      { maxElements: -1 },
      "2小时前",
      t,
    );

    verifyFormat(
      new Date(Date.UTC(2020, 7, 1, 18, 20, 40)),
      now,
      { maxElements: -1 },
      "1年193天3小时34分钟30秒前",
      t,
    );
  });

  it("formats correctly with a minimum unit (zh)", function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 40)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 21, 53, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "2分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 11)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "59分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 55, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1小时前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 20, 25, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "1小时30分钟前",
      t,
    );
    verifyFormat(
      new Date(Date.UTC(2022, 1, 10, 19, 55, 10)),
      now,
      { maxElements: -1, minimumUnit: "minute" },
      "2小时前",
      t,
    );

    verifyFormat(
      new Date(Date.UTC(2020, 7, 1, 18, 20, 40)),
      now,
      { maxElements: -1, minimumUnit: "day" },
      "1年193天前",
      t,
    );
  });
});
