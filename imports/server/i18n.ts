import i18n from "i18next";
import en from "../locales/en/serverside";
import zh from "../locales/zh/serverside";

i18n.init({
  fallbackLng: "en",
  resources: {
    en,
    zh,
  },
});

export default i18n;
