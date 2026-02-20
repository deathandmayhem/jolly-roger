import i18n from "i18next";
import en from "../locales/en.json" with { type: "json" };
import zh from "../locales/zh.json" with { type: "json" };

void i18n.init({
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  showSupportNotice: false,
});

export default i18n;
