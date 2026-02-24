import { useEffect, useRef, useState } from "react";
import { fetchDisplays, toggleDisplay, type DisplayDevice } from "../api";
import CreateDisplayModal from "./CreateDisplayModal";

// ── Countdown helpers ─────────────────────────────────────────────────────────

function calcLeft(expiresAt?: string | null) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function useCodeCountdown(expiresAt?: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(() => calcLeft(expiresAt));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const left = calcLeft(expiresAt);
      setSecondsLeft(left);
      if (left === 0) clearInterval(timerRef.current!);
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [expiresAt]);

  return secondsLeft;
}

// ── DisplayCard ───────────────────────────────────────────────────────────────

type CardProps = {
  display: DisplayDevice;
  onToggle: (updated: DisplayDevice) => void;
};

function DisplayCard({ display, onToggle }: CardProps) {
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const secondsLeft = useCodeCountdown(display.loginCodeExpiresAt);

  const codeActive = !!display.loginCode && secondsLeft > 0;

  const handleToggle = async () => {
    setToggling(true);
    setError("");
    try {
      const updated = await toggleDisplay(display._id);
      onToggle(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-indigo-600">Display #{display.number}</span>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            display.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {display.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Login code section */}
      {display.isActive ? (
        codeActive ? (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-indigo-600 font-medium">Login Code</span>
              <span
                className={`text-xs font-semibold ${
                  secondsLeft <= 10 ? "text-red-500" : "text-indigo-500"
                }`}
              >
                expires in {secondsLeft}s
              </span>
            </div>
            <p className="text-2xl font-mono font-bold text-indigo-700 tracking-widest">
              {display.loginCode}
            </p>
            <div className="mt-2 w-full bg-indigo-200 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  secondsLeft <= 10 ? "bg-red-500" : "bg-indigo-500"
                }`}
                style={{ width: `${(secondsLeft / 60) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">No active login code.</p>
            <p className="text-xs text-gray-400">Disable and re-enable to generate one.</p>
          </div>
        )
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-xs text-red-500 font-medium">Display is disabled.</p>
          <p className="text-xs text-red-400">Toggle on to generate a new login code.</p>
        </div>
      )}

      {/* Last login */}
      <div className="text-xs text-gray-400">
        {display.lastLoginAt
          ? `Last login: ${new Date(display.lastLoginAt).toLocaleString()}`
          : "Never logged in"}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`w-full py-2 text-sm font-medium rounded transition-colors disabled:opacity-50 ${
          display.isActive
            ? "bg-red-50 border border-red-300 text-red-600 hover:bg-red-100"
            : "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100"
        }`}
      >
        {toggling
          ? display.isActive ? "Disabling..." : "Enabling..."
          : display.isActive ? "Disable Display" : "Enable Display"}
      </button>
    </div>
  );
}

// ── DisplaysTab ───────────────────────────────────────────────────────────────

export default function DisplaysTab() {
  const [displays, setDisplays] = useState<DisplayDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDisplays();
      setDisplays(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load displays");
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (device: DisplayDevice) => {
    setDisplays((prev) => [...prev, device]);
  };

  const handleToggle = (updated: DisplayDevice) => {
    setDisplays((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Display Screens</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            TV / tablet order status boards visible to customers
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          + Create Display
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Loading display devices…</p>
        </div>
      ) : !error && displays.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-14 text-center">
          <p className="text-3xl mb-3">📺</p>
          <p className="text-gray-600 font-medium mb-1">No display screens yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Create a display screen to show customers their order status.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Create Display
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displays.map((d) => (
            <DisplayCard key={d._id} display={d} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <CreateDisplayModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}
