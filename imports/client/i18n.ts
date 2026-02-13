import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json" with { type: "json" };
import zh from "../locales/zh.json" with { type: "json" };

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    showSupportNotice: false,
  });

export default i18n;
