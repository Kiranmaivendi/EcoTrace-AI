import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../api";
import { useAuth } from "../context/useAuth";

function Fact({ label, value }) {
  return (
    <div className="border-b border-slate-100 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap font-medium text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

export default function PassportPage() {
  const { productId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [issueType, setIssueType] = useState("incorrect-information");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const [issueError, setIssueError] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  useEffect(() => {
    api.get(`/products/${encodeURIComponent(productId)}/passport`)
      .then(({ data: result }) => setData(result))
      .catch((requestError) => setError(requestError.response?.status === 404 ? "No passport exists for this product ID." : getErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <p className="p-10 text-center text-slate-600">Loading passport...</p>;
  if (error) return <section className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Passport unavailable</h1><p role="alert" className="mt-3 text-red-800">{error}</p><Link to="/scan" className="mt-5 inline-block font-semibold text-green-900 underline">Try another QR code</Link></section>;

  const product = data.product || data;
  const passport = data.passport || {};
  const materials = passport.materialComposition || product.materialComposition;
  const environmental = passport.environmentalInformation || product.environmentalInformation || {};
  const materialSummary = Array.isArray(materials)
    ? materials.map((item) => typeof item === "string" ? item : [item.material, item.percentage != null ? `${item.percentage}%` : ""].filter(Boolean).join(" ")).filter(Boolean).join(", ")
    : materials;
  const warranty = product.warrantyDetails && typeof product.warrantyDetails === "object"
    ? [product.warrantyDetails.duration, product.warrantyDetails.terms].filter(Boolean).join(" — ")
    : product.warrantyDetails;

  const submitIssue = async (event) => {
    event.preventDefault();
    setIssueError("");
    setIssueMessage("");
    setSubmittingIssue(true);
    try {
      await api.post(`/products/${encodeURIComponent(product.productId)}/issues`, { type: issueType, description: issueDescription });
      setIssueMessage("Thank you. Your report was submitted for review.");
      setIssueDescription("");
    } catch (requestError) {
      setIssueError(getErrorMessage(requestError));
    } finally {
      setSubmittingIssue(false);
    }
  };

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-gradient-to-r from-green-900 to-emerald-700 px-6 py-8 text-white sm:px-9">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-100">Digital product passport</p>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 text-green-50">{product.brand || "Brand not provided"} · {product.productId || passport.passportId}</p>
          <span className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm capitalize">{passport.verificationStatus || product.verificationStatus || "unverified"}</span>
        </header>

        {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="max-h-96 w-full bg-slate-100 object-contain" />}

        <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-9">
          <section>
            <h2 className="text-lg font-bold">Product and manufacturing</h2>
            <dl className="mt-3">
              <Fact label="Manufacturer" value={product.manufacturerName || data.manufacturer?.name} />
              <Fact label="Category" value={product.category} />
              <Fact label="Model number" value={product.modelNumber} />
              <Fact label="Manufacturing location" value={product.manufacturingLocation} />
              <Fact label="Manufacturing date" value={product.manufacturingDate ? new Date(product.manufacturingDate).toLocaleDateString() : ""} />
            </dl>
          </section>
          <section>
            <h2 className="text-lg font-bold">Materials and care</h2>
            <dl className="mt-3">
              <Fact label="Material composition" value={materialSummary} />
              <Fact label="Warranty" value={warranty} />
              <Fact label="Product lifespan" value={passport.productLifespan} />
              <Fact label="Repair instructions" value={product.repairInstructions} />
              <Fact label="Recycling information" value={passport.recyclingInstructions || product.recyclingInstructions} />
            </dl>
          </section>
          <section className="sm:col-span-2">
            <h2 className="text-lg font-bold">Environmental information</h2>
            <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
              <Fact label="Carbon footprint" value={environmental.carbonFootprint != null ? `${environmental.carbonFootprint} ${environmental.carbonUnit || ""}${product.carbonVerified ? " (verified)" : " (unverified)"}` : "Not provided"} />
              <Fact label="Data source" value={environmental.source} />
            </dl>
          </section>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 sm:px-9">
          Verification status reflects the stored passport record; it is not an independent forensic guarantee.
        </div>
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold">Report a passport issue</h2>
        <p className="mt-1 text-sm text-slate-600">Help us review incorrect information or a suspected counterfeit report.</p>
        {user ? (
          <form onSubmit={submitIssue} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <label className="sr-only" htmlFor="issue-type">Issue type</label>
            <select id="issue-type" value={issueType} onChange={(event) => setIssueType(event.target.value)} className="rounded-xl border border-slate-300 p-3">
              <option value="incorrect-information">Incorrect information</option>
              <option value="suspected-counterfeit">Suspected counterfeit</option>
              <option value="other">Other</option>
            </select>
            <label className="sr-only" htmlFor="issue-description">Describe the issue</label>
            <input id="issue-description" required minLength={5} maxLength={3000} value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} placeholder="Describe what should be reviewed" className="rounded-xl border border-slate-300 p-3" />
            <button disabled={submittingIssue} className="rounded-xl bg-green-800 px-5 py-3 font-semibold text-white disabled:opacity-60">{submittingIssue ? "Submitting..." : "Submit report"}</button>
          </form>
        ) : <p className="mt-3 text-sm text-slate-700"><Link to="/auth" className="font-semibold text-green-900 underline">Sign in</Link> to report an issue.</p>}
        {issueError && <p role="alert" className="mt-3 text-sm text-red-800">{issueError}</p>}
        {issueMessage && <p role="status" className="mt-3 text-sm text-green-900">{issueMessage}</p>}
      </section>
    </article>
  );
}
