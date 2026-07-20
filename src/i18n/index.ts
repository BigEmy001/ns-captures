import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import nl from "./locales/nl.json";
import pt from "./locales/pt.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
      nl: { translation: nl },
      pt: { translation: pt },
      ar: { translation: ar },
      zh: { translation: zh },
      ja: { translation: ja },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lng",
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

export default i18n;
