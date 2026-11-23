import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";

function getProductId(payload) {
  try {
    const url = new URL(payload, window.location.origin);
    const match = url.pathname.match(/\/passport\/([^/]+)/i);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return /^[a-z0-9_-]{4,80}$/i.test(payload.trim()) ? payload.trim() : null;
}

function cameraError(error) {
  if (["NotAllowedError", "PermissionDeniedError"].includes(error?.name)) {
    return "Camera permission was denied. Allow camera access in your browser settings and try again.";
  }
  if (["NotFoundError", "DevicesNotFoundError"].includes(error?.name)) {
    return "No camera was found. You can upload a QR image instead.";
  }
  if (["NotReadableError", "TrackStartError"].includes(error?.name)) {
    return "The camera is already in use by another app. Close it and retry.";
  }
  return "Could not start the camera. Camera access requires HTTPS or localhost.";
}

export default function ScannerPage() {
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const runRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => () => {
    runRef.current += 1;
    controlsRef.current?.stop();
  }, []);

  const stopCamera = () => {
    runRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraRunning(false);
    setCameraStarting(false);
  };

  const openPassport = async (payload) => {
    const productId = getProductId(payload);
    if (!productId) {
      setMessage("This QR code is not a recognized EcoTrace product passport.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await api.get(`/products/${encodeURIComponent(productId)}/passport`);
      stopCamera();
      navigate(`/passport/${encodeURIComponent(productId)}`);
    } catch (error) {
      setMessage(error.response?.status === 404
        ? "No product passport was found for this QR code."
        : getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;
    if (!window.isSecureContext) {
      setMessage("Camera scanning is unavailable over this LAN HTTP address. Open the app over HTTPS or upload a QR image instead.");
      return;
    }
    const run = runRef.current + 1;
    runRef.current = run;
    setMessage("");
    setCameraStarting(true);

    let decoded = false;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (...args) => {
        const [result, , scanControls] = args;
        if (!result || runRef.current !== run) return;
        decoded = true;
        scanControls?.stop();
        controlsRef.current = null;
        setCameraRunning(false);
        openPassport(result.getText());
      });

      if (runRef.current !== run || decoded) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setCameraRunning(true);
    } catch (error) {
      if (runRef.current === run) setMessage(cameraError(error));
    } finally {
      if (runRef.current === run) setCameraStarting(false);
    }
  };

  const uploadQr = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setMessage("");
    const imageUrl = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(imageUrl);
      await openPassport(result.getText());
    } catch {
      setMessage("Could not read a QR code from that image. Try a clearer image.");
    } finally {
      URL.revokeObjectURL(imageUrl);
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wide text-green-800">QR passport lookup</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Scan a product QR code</h1>
      <p className="mt-3 leading-7 text-slate-600">Use your camera or upload an image containing an EcoTrace passport QR code. Unknown or invalid codes are reported without showing made-up product data.</p>

      {message && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{message}</p>}

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="relative overflow-hidden rounded-2xl bg-slate-950">
          <video ref={videoRef} autoPlay muted playsInline aria-label="QR scanner camera preview" className="aspect-[4/3] w-full object-cover sm:aspect-video" />
          {!cameraRunning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white" aria-hidden="true">
              <span className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <ScanLine size={34} strokeWidth={1.8} />
              </span>
              <p className="mt-4 text-sm font-semibold">Camera preview</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-300">
                {cameraStarting ? "Allow camera access when prompted." : "Start the camera or upload a QR image."}
              </p>
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {cameraRunning ? (
            <button type="button" onClick={stopCamera} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800">
              Stop camera
            </button>
          ) : (
            <button type="button" onClick={startCamera} disabled={cameraStarting || busy} className="inline-flex items-center gap-2 rounded-xl bg-green-800 px-4 py-3 font-semibold text-white disabled:opacity-60">
              <Camera size={18} /> {cameraStarting ? "Starting camera..." : "Start camera"}
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50">
            <ImageUp size={18} /> {busy ? "Reading QR..." : "Upload QR image"}
            <input type="file" accept="image/*" className="sr-only" onChange={uploadQr} disabled={busy} />
          </label>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ScanLine size={15} /> Camera access requires HTTPS or localhost.</p>
      </div>
    </section>
  );
}
