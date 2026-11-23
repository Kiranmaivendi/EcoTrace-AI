import { useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api";

const initialForm = {
  name: "",
  brand: "",
  category: "",
  modelNumber: "",
  manufacturingLocation: "",
  manufacturingDate: "",
  materialComposition: "",
  warrantyDetails: "",
  carbonFootprint: "",
  carbonUnit: "",
  recycledContentPercentage: "",
  environmentalSource: "",
  repairInstructions: "",
  recyclingInstructions: ""
};

export default function ProductRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    const body = new FormData();
    Object.entries(form)
      .filter(([key]) => !["materialComposition", "warrantyDetails", "carbonFootprint", "carbonUnit", "recycledContentPercentage", "environmentalSource"].includes(key))
      .forEach(([key, value]) => body.append(key, value));
    body.append("materialComposition", JSON.stringify(
      form.materialComposition.split(",").map((item) => item.trim()).filter(Boolean).map((material) => ({ material }))
    ));
    body.append("warrantyDetails", JSON.stringify({ terms: form.warrantyDetails }));
    const environmentalInformation = {};
    if (form.carbonFootprint) environmentalInformation.carbonFootprint = Number(form.carbonFootprint);
    if (form.carbonUnit.trim()) environmentalInformation.carbonUnit = form.carbonUnit.trim();
    if (form.recycledContentPercentage) environmentalInformation.recycledContentPercentage = Number(form.recycledContentPercentage);
    if (form.environmentalSource.trim()) environmentalInformation.source = form.environmentalSource.trim();
    body.append("environmentalInformation", JSON.stringify(environmentalInformation));
    if (image) body.append("image", image);

    try {
      if (form.carbonFootprint && !form.environmentalSource.trim()) {
        throw new Error("Provide the source or method for the carbon footprint.");
      }
      const { data } = await api.post("/products", body);
      setResult(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, options = {}) => (
    <label key={name} className="block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={options.type || "text"}
        required={options.required}
        value={form[name]}
        onChange={update}
        min={options.min}
        max={options.max}
        placeholder={options.placeholder}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
      />
    </label>
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wide text-green-800">Manufacturer workspace</p>
      <h1 className="mt-2 text-3xl font-bold">Register a product</h1>
      <p className="mt-2 text-slate-600">Only enter information you can substantiate. Passports start unverified.</p>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {result && (
        <div role="status" className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="font-bold text-green-950">Product passport created</h2>
          <p className="mt-2 text-sm">Product ID: <code>{result.passport?.passportId || result.product?.productId || result.product?._id}</code></p>
          {result.passport?.qrDataUrl && <img src={result.passport.qrDataUrl} alt={`QR code for ${result.passport.passportId}`} className="mt-4 h-40 w-40 bg-white p-2" />}
          <Link to={`/passport/${encodeURIComponent(result.passport?.passportId || result.product?.productId || result.product?._id)}`} className="mt-4 inline-block font-semibold text-green-900 underline">View passport</Link>
        </div>
      )}

      <form onSubmit={submit} className="mt-7 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        {field("name", "Product name", { required: true })}
        {field("brand", "Brand", { required: true })}
        <label className="block text-sm font-medium text-slate-700">
          Product category
          <select name="category" value={form.category} onChange={update} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
            <option value="">Select a category</option>
            {["Electronics", "Clothing", "Furniture", "Food & beverage", "Appliance", "Other"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {field("modelNumber", "Model number")}
        {field("manufacturingLocation", "Manufacturing location")}
        {field("manufacturingDate", "Manufacturing date", { type: "date" })}
        {field("materialComposition", "Materials (comma separated)", { placeholder: "e.g. cotton, recycled polyester" })}
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Warranty details
          <textarea name="warrantyDetails" value={form.warrantyDetails} onChange={update} rows="2" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3" />
        </label>
        {field("carbonFootprint", "Carbon footprint (optional)", { type: "number", min: "0", placeholder: "Leave blank if unknown" })}
        {field("carbonUnit", "Carbon footprint unit", { placeholder: "e.g. kg CO2e" })}
        {field("recycledContentPercentage", "Recycled content (%)", { type: "number", min: "0", max: "100" })}
        {field("environmentalSource", "Carbon data source (required if entered)", { placeholder: "Method or evidence reference" })}
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Repair instructions
          <textarea name="repairInstructions" value={form.repairInstructions} onChange={update} rows="3" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3" />
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Recycling instructions
          <textarea name="recyclingInstructions" value={form.recyclingInstructions} onChange={update} rows="3" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3" />
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Product image
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm" />
        </label>
        <button disabled={busy} className="rounded-xl bg-green-800 px-5 py-3 font-semibold text-white hover:bg-green-900 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">
          {busy ? "Creating passport..." : "Register product and generate QR"}
        </button>
      </form>
    </section>
  );
}
