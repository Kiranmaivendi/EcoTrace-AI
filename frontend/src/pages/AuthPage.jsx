import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";
import { useAuth } from "../context/useAuth";

export default function AuthPage() {
  const [mode, setMode] = useState("register");
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consumer", manufacturerName: "", otp: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      if (step === "verify") {
        await api.post("/auth/verify-email", { email: form.email, otp: form.otp });
        await refreshUser();
        navigate("/dashboard");
        return;
      }

      if (mode === "register") {
        const registration = await api.post("/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          manufacturerName: form.role === "manufacturer" ? form.manufacturerName : undefined
        });
        setStep("verify");
        setMessage(registration.data.developmentOtp
          ? `Development verification code: ${registration.data.developmentOtp}`
          : "A verification code was sent to your email.");
        return;
      }

      await api.post("/auth/login", { email: form.email, password: form.password });
      await refreshUser();
      navigate("/dashboard");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      if (requestError.response?.data?.error?.code === "EMAIL_DELIVERY_UNAVAILABLE") {
        setStep("verify");
        setMessage("Your account was created, but the code could not be delivered. Try resending it after a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post("/auth/forgot-password", { email: form.email });
      setStep("reset");
      setMessage("If an account exists for this email, a reset code has been sent.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post("/auth/reset-password", {
        email: form.email,
        otp: form.otp,
        password: form.password
      });
      setStep("form");
      setMode("login");
      setMessage("Password reset. Sign in with your new password.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const isVerifying = step === "verify";
  const isResetting = step === "reset";

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-widest text-green-800">EcoTrace AI</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          {isVerifying ? "Verify your email" : isResetting ? "Reset password" : mode === "register" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isVerifying
            ? `Enter the one-time code sent to ${form.email}.`
            : isResetting
              ? "Enter the reset code from your email and choose a new password."
              : mode === "register"
                ? "Create a secure account to access product passports."
                : "Sign in to view your EcoTrace dashboard."}
        </p>

        {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-900">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        {isResetting ? (
          <form onSubmit={resetPassword} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Verification code
              <input name="otp" value={form.otp} onChange={update} required inputMode="numeric" autoComplete="one-time-code" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              New password
              <input name="password" type="password" value={form.password} onChange={update} required minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-green-800 px-4 py-3 font-semibold text-white disabled:opacity-60">
              {busy ? "Updating..." : "Reset password"}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            {!isVerifying && mode === "register" && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input name="name" value={form.name} onChange={update} required autoComplete="name" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Account type
                  <select name="role" value={form.role} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
                    <option value="consumer">Consumer</option>
                    <option value="manufacturer">Manufacturer</option>
                  </select>
                </label>
                {form.role === "manufacturer" && (
                  <label className="block text-sm font-medium text-slate-700">
                    Manufacturer / company name
                    <input name="manufacturerName" value={form.manufacturerName} onChange={update} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
                  </label>
                )}
              </>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input name="email" type="email" value={form.email} onChange={update} required autoComplete="email" readOnly={isVerifying} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 read-only:bg-slate-50" />
            </label>

            {isVerifying ? (
              <label className="block text-sm font-medium text-slate-700">
                Verification code
                <input name="otp" value={form.otp} onChange={update} required inputMode="numeric" autoComplete="one-time-code" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
              </label>
            ) : (
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input name="password" type="password" value={form.password} onChange={update} required minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
              </label>
            )}

            <button disabled={busy} className="w-full rounded-xl bg-green-800 px-4 py-3 font-semibold text-white hover:bg-green-900 disabled:cursor-wait disabled:opacity-60">
              {busy ? "Please wait..." : isVerifying ? "Verify and continue" : mode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>
        )}

        {!isVerifying && !isResetting && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setMessage("");
                setError("");
              }}
              className="font-semibold text-green-900 hover:underline"
            >
              {mode === "register" ? "Already registered? Sign in" : "Create account"}
            </button>
            {mode === "login" && (
              <button type="button" disabled={!form.email || busy} onClick={requestPasswordReset} className="text-slate-600 hover:underline disabled:opacity-50">
                Forgot password?
              </button>
            )}
          </div>
        )}
        {isVerifying && (
          <button type="button" disabled={busy} onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api.post("/auth/resend-email-otp", { email: form.email });
              setMessage("A new verification code was sent.");
            } catch (requestError) {
              setError(getErrorMessage(requestError));
            } finally {
              setBusy(false);
            }
          }} className="mt-4 text-sm font-semibold text-green-900 hover:underline">
            Resend verification code
          </button>
        )}
        <p className="mt-6 text-center text-sm text-slate-600"><Link to="/" className="hover:underline">Back to home</Link></p>
      </div>
    </section>
  );
}
