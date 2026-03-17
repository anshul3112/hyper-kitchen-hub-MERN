import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
};

export default function DashboardHeader({ title, subtitle }: Props) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const API_BASE_URL =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
    "http://localhost:8000";

  const executeLogout = async () => {
    await fetch(`${API_BASE_URL}/api/v1/users/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined);

    localStorage.removeItem("userRole");
    localStorage.removeItem("outletId");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <>
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-blue-600">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Profile
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    {showConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Confirm Logout</h2>
          <p className="text-sm text-gray-500 mb-6">Are you sure you want to logout?</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              No
            </button>
            <button
              onClick={executeLogout}
              className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    )}
  </>);
}
