import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  title?: string;
  message: string;
};

export default function AccessBlockedScreen({
  title = "Access blocked",
  message,
}: Props) {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
          !
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
        <button
          onClick={() => setShowConfirm(true)}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Back to login
        </button>
      </div>

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
    </div>
  );
}