import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import { getKioskSession } from "../api";

export default function KioskOrderTypePage() {
  const navigate = useNavigate();
  const session = getKioskSession();
  const { t } = useTranslation("common");

  useEffect(() => {
    if (!session) {
      navigate("/kiosk/login");
      return;
    }
    // If order type was already chosen, skip straight to the dashboard
    if (sessionStorage.getItem("kioskOrderType")) {
      navigate("/kiosk/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;

  const select = (type: "dineIn" | "takeAway") => {
    sessionStorage.setItem("kioskOrderType", type);
    navigate("/kiosk/dashboard");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-12 select-none px-6">
      {/* Heading */}
      <div className="text-center">
        <p className="text-3xl font-black text-purple-700">{t("howOrderQuestion")}</p>
        <p className="text-gray-400 mt-2 text-base">{t("selectPreference")}</p>
      </div>

      {/* Choice cards */}
      <div className="flex gap-8">
        {/* Dine In */}
        <button
          onClick={() => select("dineIn")}
          className="flex flex-col items-center justify-center gap-4 w-56 h-56 bg-white border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-500 active:scale-95 text-purple-700 rounded-3xl shadow-md transition-all duration-200 focus:outline-none group"
        >
          <span className="rounded-full border border-purple-200 px-5 py-2 text-sm font-bold uppercase tracking-[0.3em] group-hover:border-purple-500 transition-colors duration-200">DI</span>
          <span className="text-2xl font-black tracking-wide">{t("dineIn")}</span>
        </button>

        {/* Take Away */}
        <button
          onClick={() => select("takeAway")}
          className="flex flex-col items-center justify-center gap-4 w-56 h-56 bg-white border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-500 active:scale-95 text-purple-700 rounded-3xl shadow-md transition-all duration-200 focus:outline-none group"
        >
          <span className="rounded-full border border-purple-200 px-5 py-2 text-sm font-bold uppercase tracking-[0.3em] group-hover:border-purple-500 transition-colors duration-200">TA</span>
          <span className="text-2xl font-black tracking-wide">{t("takeAway")}</span>
        </button>
      </div>

      {/* Back */}
      <button
        onClick={() => navigate("/kiosk/start")}
        className="text-gray-400 hover:text-purple-600 text-sm transition-colors"
      >
        ← {t("back")}
      </button>
    </div>
  );
}
