import { useEffect, useState } from "react";
import { fetchProfile } from "../../auth/api";
import { fetchTenantLanguages, updateTenantLanguages } from "../api";
import { LANGUAGE_META, SUPPORTED_LANGUAGES } from "../../../common/utils/languages";

// Languages the tenant admin can toggle (everything except English)
const SELECTABLE_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l !== "English");

export default function TenantKioskSettings() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const profile = await fetchProfile();
        const tid = profile.tenant?.tenantId;
        if (!tid) throw new Error("No tenant associated with your account");
        setTenantId(tid);
        const langs = await fetchTenantLanguages(tid);
        setSelected(langs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load language settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggle(lang: string) {
    setSelected((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
    setSuccessMsg("");
  }

  async function handleSave() {
    if (!tenantId) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const updated = await updateTenantLanguages(tenantId, selected);
      setSelected(updated);
      setSuccessMsg("Language settings saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Loading language settings…
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Kiosk Language Settings</h2>
      <p className="text-sm text-gray-500 mb-6">
        English is always available on the kiosk. Select additional languages your customers
        can choose from.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* English — always on, disabled */}
      <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-gray-200 mb-3 opacity-60 select-none">
        <input type="checkbox" checked readOnly className="w-4 h-4 accent-purple-600" />
        <span className="font-medium text-gray-700">
          English
          <span className="ml-2 text-xs text-gray-400 font-normal">(always on)</span>
        </span>
      </div>

      {/* Selectable additional languages */}
      {SELECTABLE_LANGUAGES.map((lang) => {
        const meta = LANGUAGE_META[lang];
        const isOn = selected.includes(lang);
        return (
          <label
            key={lang}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl border mb-3 cursor-pointer transition-colors ${
              isOn
                ? "bg-purple-50 border-purple-300"
                : "bg-white border-gray-200 hover:border-purple-200"
            }`}
          >
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => toggle(lang)}
              className="w-4 h-4 accent-purple-600"
            />
            <span className="font-medium text-gray-700">
              {lang}
              {meta && (
                <span className="ml-2 text-sm text-gray-400 font-normal">
                  ({meta.nativeLabel})
                </span>
              )}
            </span>
          </label>
        );
      })}

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {successMsg && (
          <span className="text-green-600 text-sm font-medium">{successMsg}</span>
        )}
      </div>
    </div>
  );
}
