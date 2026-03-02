import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getKioskSession } from "../api";

export default function KioskOrderTypePage() {
  const navigate = useNavigate();
  const session = getKioskSession();

  useEffect(() => {
    if (!session) {
      navigate("/kiosk/login", { replace: true });
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
        <p className="text-3xl font-black text-purple-700">How would you like your order?</p>
        <p className="text-gray-400 mt-2 text-base">Select your preference to continue</p>
      </div>

      {/* Choice cards */}
      <div className="flex gap-8">
        {/* Dine In */}
        <button
          onClick={() => select("dineIn")}
          className="flex flex-col items-center justify-center gap-4 w-56 h-56 bg-white border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-500 active:scale-95 text-purple-700 rounded-3xl shadow-md transition-all duration-200 focus:outline-none group"
        >
          <span className="text-7xl group-hover:scale-110 transition-transform duration-200">🍽️</span>
          <span className="text-2xl font-black tracking-wide">Dine In</span>
        </button>

        {/* Take Away */}
        <button
          onClick={() => select("takeAway")}
          className="flex flex-col items-center justify-center gap-4 w-56 h-56 bg-white border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-500 active:scale-95 text-purple-700 rounded-3xl shadow-md transition-all duration-200 focus:outline-none group"
        >
          <span className="text-7xl group-hover:scale-110 transition-transform duration-200">🛍️</span>
          <span className="text-2xl font-black tracking-wide">Take Away</span>
        </button>
      </div>

      {/* Back */}
      <button
        onClick={() => navigate("/kiosk/start")}
        className="text-gray-400 hover:text-purple-600 text-sm transition-colors"
      >
        ← Back
      </button>
    </div>
  );
}
