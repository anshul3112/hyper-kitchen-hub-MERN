import { useState, useEffect, useRef } from "react";
import { createDisplay, type DisplayDevice } from "../api";

type Props = {
  onClose: () => void;
  onSuccess: (device: DisplayDevice) => void;
};

export default function CreateDisplayModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<DisplayDevice | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!created) return;
    setSecondsLeft(60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [created]);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const device = await createDisplay();
      setCreated(device);
      onSuccess(device);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create display device");
    } finally {
      setLoading(false);
    }
  };

  const codeExpired = secondsLeft === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Create Display Screen</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {created ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📺</span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">
              Display #{created.number} created!
            </p>
            <p className="text-sm text-gray-500 mb-1">
              Enter this code on the display device to activate it:
            </p>
            <p className="text-xs text-amber-600 font-medium mb-4">
              ⚠ Expires in {secondsLeft}s — enter it quickly
            </p>

            {codeExpired ? (
              <div className="bg-red-50 border border-red-200 rounded-xl py-4 px-6 mb-4">
                <p className="text-sm font-medium text-red-600">Code expired</p>
                <p className="text-xs text-red-400 mt-1">Close this and create a new display to get a fresh code.</p>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl py-5 px-6 mb-4">
                <p className="text-5xl font-mono font-black text-indigo-700 tracking-[0.3em]">
                  {created.loginCode}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-4">
              Navigate to{" "}
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                /display/login
              </span>{" "}
              on the display device.
            </p>

            <button onClick={onClose} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition">
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📺</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Creates a new display screen device for this outlet. You'll get a one-time login code.
            </p>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                ⚠️ {error}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60">
                {loading ? "Creating…" : "Create Display"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
