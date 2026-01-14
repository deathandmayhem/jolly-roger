import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "../locales/en";
import zh from "../locales/zh";

i18n.use(LanguageDetector).use(initReactI18next).init({
  fallbackLng: "en",
  resources: {
    en,
    zh,
  },
});

export default i18n;
