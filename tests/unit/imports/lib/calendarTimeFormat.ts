import { assert } from "chai";
import i18next, { type TFunction } from "i18next";
import { calendarTimeFormat } from "../../../../imports/lib/calendarTimeFormat";
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

describe("calendarTimeFormat", function () {
  const language = "en";
  let t: TFunction;
  this.beforeAll(async function () {
    t = await initTestI18n(language);
  });
  it("formats dates today correctly", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(
      calendarTimeFormat(now, t, language, now),
      /Today at 7:26\sPM/,
    );
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 6, 11, 10), t, language, now),
      /Today at 11:10\sAM/,
    );
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 6, 22, 50), t, language, now),
      /Today at 10:50\sPM/,
    );
  });

  it("formats dates from the last week correctly", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 4, 10, 5), t, language, now),
      /Wed 10:05\sAM/,
    );
  });

  it("formats dates from more than a week ago long-format", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(
      calendarTimeFormat(new Date(2021, 6, 20, 15, 25), t, language, now),
      /7\/20\/2021, 3:25\sPM/,
    );
    // including the boundary condition, which is a bit odd but ok
    assert.match(
      calendarTimeFormat(new Date(2021, 6, 31, 9, 40), t, language, now),
      /7\/31\/2021, 9:40\sAM/,
    );
  });

  it("formats future dates in long-format", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 7, 2, 27), t, language, now),
      /8\/7\/2021, 2:27\sAM/,
    );
    assert.match(
      calendarTimeFormat(new Date(2022, 0, 15, 16, 2), t, language, now),
      /1\/15\/2022, 4:02\sPM/,
    );
  });
});

describe("calendarTimeFormat_zh", function () {
  const language = "zh";
  let t: TFunction;
  this.beforeAll(async function () {
    t = await initTestI18n(language);
  });
  it("formats dates today correctly (zh)", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(calendarTimeFormat(now, t, language, now), /今天 19:26/);
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 6, 11, 10), t, language, now),
      /今天 11:10/,
    );
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 6, 22, 50), t, language, now),
      /今天 22:50/,
    );
  });

  it("formats dates from the last week correctly (zh)", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 4, 10, 5), t, language, now),
      /周三10:05/,
    );
  });

  it("formats dates from more than a week ago long-format (zh)", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(
      calendarTimeFormat(new Date(2021, 6, 20, 15, 25), t, language, now),
      /2021\/7\/20 15:25/,
    );
    // including the boundary condition, which is a bit odd but ok
    assert.match(
      calendarTimeFormat(new Date(2021, 6, 31, 9, 40), t, language, now),
      /2021\/7\/31 9:40/,
    );
  });

  it("formats future dates in long-format (zh)", function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.match(
      calendarTimeFormat(new Date(2021, 7, 7, 2, 27), t, language, now),
      /2021\/8\/7 2:27/,
    );
    assert.match(
      calendarTimeFormat(new Date(2022, 0, 15, 16, 2), t, language, now),
      /2022\/1\/15 16:02/,
    );
  });
});
