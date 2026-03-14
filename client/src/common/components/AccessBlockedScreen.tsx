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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
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