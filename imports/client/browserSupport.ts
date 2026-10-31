// This runs on all clients, including browsers we otherwise don't support, so
// only use long-supported APIs.

import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "../locales/en.json" with { type: "json" };
import zh from "../locales/zh.json" with { type: "json" };

function showUnsupportedPage() {
  // We want to be able to translate the unsupported browser message, but we don't
  // want to pull in (e.g.) React by using the normal i18n setup, so use a
  // separate instance here.
  const i18n = i18next.createInstance();
  void i18n.use(LanguageDetector).init({
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
  });

  const container = document.createElement("div");
  container.style.cssText =
    "max-width: 36rem; margin: 4rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.5;";
  const heading = document.createElement("h1");
  heading.textContent = i18n.t(
    "unsupportedBrowser.title",
    "Your browser isn't supported",
  );
  const message = document.createElement("p");
  message.textContent = i18n.t(
    "unsupportedBrowser.message",
    "Jolly Roger needs a newer browser. Please update to the latest version of Chrome, Firefox, Safari, or Edge.",
  );
  container.append(heading, message);
  document.body.append(container);
}

// Check for the newest feature we depend on (es2023.array)
if (typeof Array.prototype.toSorted !== "function") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showUnsupportedPage);
  } else {
    showUnsupportedPage();
  }
  // Keep client/main.ts from loading the rest of the app
  throw new Error("Unsupported browser");
}
