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
  const API_BASE_URL =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
    "http://localhost:8000";

  const handleLogout = async () => {
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
          onClick={handleLogout}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}