import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import { getKioskSession, fetchKioskLanguages } from "../api";
import { LANGUAGE_META } from "../../../common/utils/languages";

export default function KioskStartPage() {
  const navigate = useNavigate();
  const session = getKioskSession();
  const { t, i18n } = useTranslation("common");
  const [extraLanguages, setExtraLanguages] = useState<string[]>([]);

  function switchLanguage(lang: string) {
    i18n.changeLanguage(lang);
  }

  useEffect(() => {
    fetchKioskLanguages()
      .then(setExtraLanguages)
      .catch(() => {
        // Non-fatal: fall back to English-only if fetch fails
        setExtraLanguages([]);
      });
  }, []);


  useEffect(() => {
    function preventBack() {
      history.pushState(null, "", location.href);
    }

    preventBack();

    window.addEventListener("popstate", preventBack);
    return () => window.removeEventListener("popstate", preventBack);
  }, []);

  useEffect(() => {
    if (!session) {
      navigate("/kiosk/login");
      return;
    }
    // If an order flow is already in progress, go straight to the dashboard
    if (sessionStorage.getItem("kioskOrderType")) {
      navigate("/kiosk/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center select-none px-6">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 flex gap-2">
        {/* English is always shown */}
        <button
          onClick={() => switchLanguage("en")}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
            i18n.language === "en"
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-white text-purple-600 border-purple-300 hover:border-purple-600"
          }`}
        >
          English
        </button>

        {/* Tenant-configured additional languages */}
        {extraLanguages.map((lang) => {
          const meta = LANGUAGE_META[lang];
          if (!meta) return null;
          return (
            <button
              key={lang}
              onClick={() => switchLanguage(meta.code)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                i18n.language === meta.code
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-purple-600 border-purple-300 hover:border-purple-600"
              }`}
            >
              {meta.nativeLabel}
            </button>
          );
        })}
      </div>

      {/* Icon */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <p className="text-5xl font-black text-purple-700 tracking-tight">{t("welcome")}</p>
        <p className="text-gray-400 text-lg">{t("orderStartsHere")}</p>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate("/kiosk/order-type")}
        className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-2xl px-24 py-7 rounded-3xl shadow-xl transition-all duration-200 focus:outline-none"
      >
        {t("startOrder")}
      </button>

      <p className="text-gray-300 text-sm mt-8 select-none">{t("clickToBegin")}</p>
    </div>
  );
}
