import { useState } from "react";
import { Bot, ImageUp, Send } from "lucide-react";
import { api, getErrorMessage } from "../api";

const suggestedQuestions = [
  "What materials are recorded for this product?",
  "Is this product recyclable based on its passport?",
  "What repair guidance is available?",
  "What warranty information is provided?"
];

export default function AssistantPage() {
  const [productId, setProductId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState(null);
  const [screening, setScreening] = useState(null);

  const ask = async (event, mode = "assistant") => {
    event?.preventDefault();
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const { data } = await api.post("/ai/assistant", { passportId: productId, question: mode === "assistant" ? question : `${mode} guidance: ${question}` });
      setAnswer(data.answer);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const screenImage = async (event) => {
    event.preventDefault();
    if (!image) return;
    setBusy(true);
    setError("");
    setScreening(null);
    const body = new FormData();
    body.append("passportId", productId);
    body.append("image", image);
    try {
      const { data } = await api.post("/ai/counterfeit", body);
      setScreening(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-green-100 p-3 text-green-900"><Bot size={24} /></span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-green-800">Passport-grounded guidance</p>
          <h1 className="text-3xl font-bold text-slate-950">AI Product Assistant</h1>
        </div>
      </div>
      <p className="mt-4 leading-7 text-slate-600">Answers are generated only from the selected stored passport and are unavailable until an AI service is configured. Missing product facts should be stated, not guessed.</p>

      {error && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{error}</p>}

      <form onSubmit={ask} className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <label className="block text-sm font-medium text-slate-700">
          Product passport ID
          <input value={productId} onChange={(event) => setProductId(event.target.value)} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Enter the ID printed under the product QR code" />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestedQuestions.map((item) => (
            <button type="button" key={item} onClick={() => setQuestion(item)} className="rounded-full border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 hover:border-green-500">
              {item}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Ask about the product
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} required rows="3" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Ask a question about repair, warranty, materials, or recycling..." />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-green-800 px-4 py-3 font-semibold text-white disabled:opacity-60"><Send size={17} /> {busy ? "Checking passport..." : "Ask assistant"}</button>
          <button type="button" disabled={busy || !productId || !question} onClick={(event) => ask(event, "repair")} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 disabled:opacity-60">Repair guidance</button>
          <button type="button" disabled={busy || !productId || !question} onClick={(event) => ask(event, "recycling")} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 disabled:opacity-60">Recycling guidance</button>
        </div>
      </form>

      {answer && <article className="mt-5 whitespace-pre-wrap rounded-2xl border border-green-200 bg-green-50 p-5 leading-7 text-slate-800">{answer}</article>}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-bold">AI image screening</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Screening requires a trusted manufacturer reference image and a configured vision model. It is not forensic verification.</p>
        <form onSubmit={screenImage} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
            Product image to screen
            <input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setImage(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm" />
          </label>
          <button disabled={busy || !productId} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold disabled:opacity-50"><ImageUp size={17} /> Screen image</button>
        </form>
        {screening && (
          <div role="status" className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold">{screening.assessment || "Assessment unavailable"}</p>
            <p className="mt-2">{screening.message || screening.summary}</p>
            <p className="mt-2 text-slate-600">Confidence: {screening.confidence == null ? "Not available" : `${screening.confidence}%`}. AI screening is not forensic verification.</p>
          </div>
        )}
      </section>
    </section>
  );
}
