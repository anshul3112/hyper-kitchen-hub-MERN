import { useState, useEffect, useRef } from "react";
import { createKiosk, type Kiosk } from "../api";

type Props = {
  onClose: () => void;
  onSuccess: (kiosk: Kiosk) => void;
};

export default function CreateKioskModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdKiosk, setCreatedKiosk] = useState<Kiosk | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown once kiosk is created
  useEffect(() => {
    if (!createdKiosk) return;
    setSecondsLeft(60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [createdKiosk]);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const kiosk = await createKiosk();
      setCreatedKiosk(kiosk);
      onSuccess(kiosk);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create kiosk");
    } finally {
      setLoading(false);
    }
  };

  const codeExpired = secondsLeft === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Create New Kiosk</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {createdKiosk ? (
          // Success view — show login code with countdown
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">
              Kiosk #{createdKiosk.number} created!
            </p>
            <p className="text-sm text-gray-500 mb-1">
              Enter this code on the kiosk device to log in:
            </p>
            <p className="text-xs text-amber-600 font-medium mb-4">
              ⚠ This code will expire after 1 minute.
            </p>

            {codeExpired ? (
              <div className="bg-red-50 border border-red-200 rounded-lg py-4 px-6 mb-4">
                <p className="text-sm font-medium text-red-600">Code expired</p>
                <p className="text-xs text-red-400 mt-1">Close this and create a new kiosk to generate a fresh code.</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg py-4 px-6 mb-3">
                <p className="text-4xl font-mono font-bold text-blue-700 tracking-widest">
                  {createdKiosk.loginCode ?? createdKiosk.code}
                </p>
              </div>
            )}

            {/* Countdown bar */}
            {!codeExpired && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Expires in</span>
                  <span className={secondsLeft <= 10 ? "text-red-500 font-semibold" : ""}>
                    {secondsLeft}s
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      secondsLeft <= 10 ? "bg-red-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${(secondsLeft / 60) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6">
            {error ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : null}

            <p className="text-sm text-gray-600 mb-6">
              A new kiosk will be assigned the next available number automatically.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Kiosk"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
