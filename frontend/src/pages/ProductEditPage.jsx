import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../api";

const emptyForm = {
  name: "",
  brand: "",
  category: "",
  modelNumber: "",
  manufacturingLocation: "",
  manufacturingDate: "",
  materialComposition: "",
  warrantyDuration: "",
  warrantyTerms: "",
  carbonFootprint: "",
  carbonUnit: "",
  recycledContentPercentage: "",
  environmentalSource: "",
  repairInstructions: "",
  recyclingInstructions: ""
};

function toForm(product) {
  const environmental = product.environmentalInformation || {};
  const warranty = product.warrantyDetails || {};
  return {
    name: product.name || "",
    brand: product.brand || "",
    category: product.category || "",
    modelNumber: product.modelNumber || "",
    manufacturingLocation: product.manufacturingLocation || "",
    manufacturingDate: product.manufacturingDate ? new Date(product.manufacturingDate).toISOString().slice(0, 10) : "",
    materialComposition: (product.materialComposition || []).map((item) => item.material).filter(Boolean).join(", "),
    warrantyDuration: warranty.duration || "",
    warrantyTerms: warranty.terms || "",
    carbonFootprint: environmental.carbonFootprint ?? "",
    carbonUnit: environmental.carbonUnit || "",
    recycledContentPercentage: environmental.recycledContentPercentage ?? "",
    environmentalSource: environmental.source || "",
    repairInstructions: product.repairInstructions || "",
    recyclingInstructions: product.recyclingInstructions || ""
  };
}

export default function ProductEditPage() {
  const { productId } = useParams();
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get(`/products/${encodeURIComponent(productId)}`)
      .then(({ data }) => setForm(toForm(data.product)))
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, [productId]);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (form.carbonFootprint !== "" && !form.environmentalSource.trim()) {
        throw new Error("Provide the source or method for the carbon footprint.");
      }
      const body = new FormData();
      body.append("name", form.name);
      body.append("brand", form.brand);
      body.append("category", form.category);
      body.append("modelNumber", form.modelNumber);
      body.append("manufacturingLocation", form.manufacturingLocation);
      if (form.manufacturingDate) body.append("manufacturingDate", form.manufacturingDate);
      body.append("materialComposition", JSON.stringify(
        form.materialComposition.split(",").map((item) => item.trim()).filter(Boolean).map((material) => ({ material }))
      ));
      body.append("warrantyDetails", JSON.stringify({ duration: form.warrantyDuration, terms: form.warrantyTerms }));
      const environmentalInformation = {};
      if (form.carbonFootprint !== "") environmentalInformation.carbonFootprint = Number(form.carbonFootprint);
      if (form.carbonUnit.trim()) environmentalInformation.carbonUnit = form.carbonUnit.trim();
      if (form.recycledContentPercentage !== "") environmentalInformation.recycledContentPercentage = Number(form.recycledContentPercentage);
      if (form.environmentalSource.trim()) environmentalInformation.source = form.environmentalSource.trim();
      body.append("environmentalInformation", JSON.stringify(environmentalInformation));
      body.append("repairInstructions", form.repairInstructions);
      body.append("recyclingInstructions", form.recyclingInstructions);
      if (image) body.append("image", image);
      await api.patch(`/products/${encodeURIComponent(productId)}`, body);
      setMessage("Passport updated. Its verification status has been reset to unverified pending review.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="p-10 text-center text-slate-600">Loading product...</p>;

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wide text-green-800">Manufacturer workspace</p>
      <h1 className="mt-2 text-3xl font-bold">Edit product passport</h1>
      <p className="mt-2 text-slate-600">Changes to a passport reset its verification status so an admin can review the new information.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">{message} <Link to={`/passport/${encodeURIComponent(productId)}`} className="font-semibold underline">View passport</Link></p>}
      <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <label className="text-sm font-medium">Product name<input name="name" required value={form.name} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Brand<input name="brand" value={form.brand} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Category<input name="category" required value={form.category} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Model number<input name="modelNumber" value={form.modelNumber} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Manufacturing location<input name="manufacturingLocation" value={form.manufacturingLocation} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Manufacturing date<input name="manufacturingDate" type="date" value={form.manufacturingDate} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">Materials (comma separated)<input name="materialComposition" value={form.materialComposition} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Warranty duration<input name="warrantyDuration" value={form.warrantyDuration} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Carbon footprint<input name="carbonFootprint" type="number" min="0" value={form.carbonFootprint} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Carbon unit<input name="carbonUnit" value={form.carbonUnit} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium">Recycled content (%)<input name="recycledContentPercentage" type="number" min="0" max="100" value={form.recycledContentPercentage} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">Environmental data source<input name="environmentalSource" value={form.environmentalSource} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">Warranty terms<textarea name="warrantyTerms" rows="2" value={form.warrantyTerms} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">Repair instructions<textarea name="repairInstructions" rows="3" value={form.repairInstructions} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">Recycling instructions<textarea name="recyclingInstructions" rows="3" value={form.recyclingInstructions} onChange={update} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">Replace product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm" /></label>
        <button disabled={busy} className="rounded-xl bg-green-800 px-5 py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2">{busy ? "Saving..." : "Save passport changes"}</button>
      </form>
    </section>
  );
}
