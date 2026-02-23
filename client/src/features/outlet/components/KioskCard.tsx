import { useState, useEffect, useRef } from "react";
import type { Kiosk, KioskStatus } from "../api";

const statusStyles: Record<KioskStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  OFFLINE: "bg-gray-100 text-gray-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  DISABLED: "bg-red-100 text-red-800",
};

type Props = {
  kiosk: Kiosk;
  onToggle: (updated: Kiosk) => void;
};

function calcLeft(expiresAt?: string) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function useCodeCountdown(expiresAt?: string) {
  // Initialise from expiresAt so the value is correct on first render
  const [secondsLeft, setSecondsLeft] = useState(() => calcLeft(expiresAt));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Only call setState from inside the interval callback (external-system pattern)
    timerRef.current = setInterval(() => {
      const left = calcLeft(expiresAt);
      setSecondsLeft(left);
      if (left === 0) clearInterval(timerRef.current!);
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [expiresAt]);

  return secondsLeft;
}

export default function KioskCard({ kiosk, onToggle }: Props) {
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const secondsLeft = useCodeCountdown(kiosk.loginCodeExpiresAt);

  const codeActive = !!kiosk.loginCode && secondsLeft > 0;

  const handleToggle = async () => {
    setToggling(true);
    setToggleError("");
    try {
      const { toggleKiosk } = await import("../api");
      const updated = await toggleKiosk(kiosk._id);
      onToggle(updated);
    } catch (err: unknown) {
      setToggleError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-blue-600">Kiosk #{kiosk.number}</span>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[kiosk.status]}`}>
          {kiosk.status}
        </span>
      </div>

      {/* Login code section */}
      {kiosk.isActive ? (
        codeActive ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-600 font-medium">Login Code</span>
              <span className={`text-xs font-semibold ${
                secondsLeft <= 10 ? "text-red-500" : "text-blue-500"
              }`}>
                expires in {secondsLeft}s
              </span>
            </div>
            <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">
              {kiosk.loginCode}
            </p>
            {/* Countdown bar */}
            <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  secondsLeft <= 10 ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${(secondsLeft / 60) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">No active login code.</p>
            <p className="text-xs text-gray-400">Enable the kiosk to generate one.</p>
          </div>
        )
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-xs text-red-500 font-medium">Kiosk is disabled.</p>
          <p className="text-xs text-red-400">Toggle on to generate a new login code.</p>
        </div>
      )}

      {/* Last login */}
      <div className="text-xs text-gray-400">
        {kiosk.lastLoginAt
          ? `Last login: ${new Date(kiosk.lastLoginAt).toLocaleString()}`
          : "Never logged in"}
      </div>

      {/* Toggle error */}
      {toggleError && (
        <p className="text-xs text-red-500">{toggleError}</p>
      )}

      {/* Disable / Enable button */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`w-full py-2 text-sm font-medium rounded transition-colors disabled:opacity-50 ${
          kiosk.isActive
            ? "bg-red-50 border border-red-300 text-red-600 hover:bg-red-100"
            : "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100"
        }`}
      >
        {toggling
          ? kiosk.isActive ? "Disabling..." : "Enabling..."
          : kiosk.isActive ? "Disable Kiosk" : "Enable Kiosk"}
      </button>
    </div>
  );
}
