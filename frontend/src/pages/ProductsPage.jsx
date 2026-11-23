import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api, getErrorMessage } from "../api";

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/products", { params: { q: query, category } })
      .then(({ data }) => setProducts(data.products || []))
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, [query, category]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wide text-green-800">Public product passports</p>
      <h1 className="mt-2 text-3xl font-bold">Explore products</h1>
      <p className="mt-2 text-slate-600">Search registered records. No sample products are shown.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, brand, or passport ID" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by product category" className="rounded-xl border border-slate-300 bg-white px-3 py-3">
          <option value="">All categories</option>
          {["Electronics", "Clothing", "Furniture", "Food & beverage", "Appliance", "Other"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {loading ? <p className="mt-8 text-slate-600">Searching product records...</p> : products.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No matching product records were found.</p>
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link key={product.productId || product._id} to={`/passport/${encodeURIComponent(product.productId)}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-green-400">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.productId}</p>
              <h2 className="mt-2 text-lg font-bold">{product.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{product.brand || "Brand not provided"} · {product.category || "Category not provided"}</p>
              <p className="mt-3 text-xs capitalize text-amber-800">{product.verificationStatus || "unverified"}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
