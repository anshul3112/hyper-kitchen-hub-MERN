import { useState } from "react";
import { createKiosk, type Kiosk } from "../api";

type Props = {
  onClose: () => void;
  onSuccess: (kiosk: Kiosk) => void;
};

export default function CreateKioskModal({ onClose, onSuccess }: Props) {
  const [number, setNumber] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdKiosk, setCreatedKiosk] = useState<Kiosk | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const num = parseInt(number, 10);
    if (!num || num < 1) {
      setError("Please enter a valid kiosk number (≥ 1)");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const kiosk = await createKiosk(num);
      setCreatedKiosk(kiosk);
      onSuccess(kiosk);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create kiosk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Create New Kiosk</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {createdKiosk ? (
          // Success view — show login code prominently
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">
              Kiosk #{createdKiosk.number} created!
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Share this login code with the kiosk device:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg py-4 px-6 mb-6">
              <p className="text-3xl font-mono font-bold text-blue-700 tracking-widest">
                {createdKiosk.loginCode ?? createdKiosk.code}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6">
            {error ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : null}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kiosk Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-400">Must be unique within this outlet.</p>
            </div>

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
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Kiosk"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
