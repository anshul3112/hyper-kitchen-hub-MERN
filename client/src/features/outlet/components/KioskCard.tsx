import type { Kiosk, KioskStatus } from "../api";

const statusStyles: Record<KioskStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  OFFLINE: "bg-gray-100 text-gray-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  DISABLED: "bg-red-100 text-red-800",
};

type Props = {
  kiosk: Kiosk;
};

export default function KioskCard({ kiosk }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-blue-600">Kiosk #{kiosk.number}</span>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[kiosk.status]}`}>
          {kiosk.status}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Login Code:</span>
        <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded tracking-widest">
          {kiosk.code}
        </span>
      </div>

      <div className="text-xs text-gray-400">
        {kiosk.lastLoginAt
          ? `Last login: ${new Date(kiosk.lastLoginAt).toLocaleString()}`
          : "Never logged in"}
      </div>
    </div>
  );
}
