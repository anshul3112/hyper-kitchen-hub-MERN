import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getKioskSession } from "../api";

export default function KioskStartPage() {
  const navigate = useNavigate();
  const session = getKioskSession();

  useEffect(() => {
    if (!session) {
      navigate("/kiosk/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center select-none px-6">
      {/* Icon */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <div className="w-28 h-28 rounded-full bg-purple-100 flex items-center justify-center shadow-inner">
          <span className="text-6xl">🍽️</span>
        </div>
        <p className="text-5xl font-black text-purple-700 tracking-tight">Welcome!</p>
        <p className="text-gray-400 text-lg">Your order starts here</p>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate("/kiosk/order-type")}
        className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-2xl px-24 py-7 rounded-3xl shadow-xl transition-all duration-200 focus:outline-none"
      >
         Start Order
      </button>

      <p className="text-gray-300 text-sm mt-8 select-none">Click the button to begin</p>
    </div>
  );
}
