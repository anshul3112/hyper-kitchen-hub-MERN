import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { displayLogin, saveDisplaySession } from "../api";

const CODE_LENGTH = 6;

export default function DisplayLoginPage() {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (digit && index === CODE_LENGTH - 1) {
      const code = [...next].join("");
      if (code.length === CODE_LENGTH) submit(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH) submit(pasted);
  };

  const submit = async (code: string) => {
    if (code.length !== CODE_LENGTH) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await displayLogin(code);
      saveDisplaySession(session);
      navigate("/display/screen");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const filled = digits.every((d) => d !== "");

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">📺</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Order Display Login</h1>
        <p className="text-sm text-gray-500 mb-8">
          Enter the 6-digit code from the outlet admin panel.
        </p>

        {/* OTP input */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className={`w-12 h-14 text-center text-2xl font-mono font-bold border-2 rounded-lg outline-none transition-colors
                ${digit ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300 text-gray-800"}
                focus:border-indigo-500 disabled:opacity-50`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={() => submit(digits.join(""))}
          disabled={!filled || loading}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
        >
          {loading ? "Verifying…" : "Activate Display"}
        </button>
      </div>
    </div>
  );
}
