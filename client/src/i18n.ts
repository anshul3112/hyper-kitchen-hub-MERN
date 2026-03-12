import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import hiCommon from "./locales/hi/common.json";

const savedLang = localStorage.getItem("kioskLang") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    hi: { common: hiCommon },
  },
  lng: savedLang,
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lang) => {
  localStorage.setItem("kioskLang", lang);
});

export default i18n;
