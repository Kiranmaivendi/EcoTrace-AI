import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, ScanLine } from "lucide-react";
import { api, getErrorMessage } from "../api";
import { useAuth } from "../context/useAuth";

function EmptyState({ manufacturer }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Package className="mx-auto text-slate-400" size={32} />
      <h2 className="mt-4 text-lg font-bold">No product passports yet</h2>
      <p className="mt-2 text-sm text-slate-600">
        {manufacturer ? "Register a product to create its first passport." : "Scan a product QR code to view its passport."}
      </p>
      <Link to={manufacturer ? "/products/new" : "/scan"} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-800 px-4 py-3 font-semibold text-white">
        {manufacturer ? <><Plus size={18} /> Register product</> : <><ScanLine size={18} /> Scan QR code</>}
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard")
      .then(({ data: result }) => setData(result))
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, []);

  const products = data?.products || [];
  const activities = data?.recentActivity || [];
  const isManufacturer = user?.role === "manufacturer" || user?.role === "admin";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-800">{user?.role || "account"} dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Welcome, {user?.name || user?.email}</h1>
          <p className="mt-2 text-slate-600">Your products and recent passport activity.</p>
        </div>
        {isManufacturer && <Link to="/products/new" className="inline-flex items-center gap-2 rounded-xl bg-green-800 px-4 py-3 font-semibold text-white"><Plus size={18} /> Register product</Link>}
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p className="mt-8 text-slate-600">Loading dashboard...</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">Registered products</p>
              <p className="mt-2 text-3xl font-bold">{data?.summary?.productCount ?? products.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">Passport status</p>
              <p className="mt-2 text-lg font-semibold">Verification is shown per product</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">Account type</p>
              <p className="mt-2 text-lg font-semibold capitalize">{user?.role}</p>
            </article>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
            <section>
              <h2 className="text-xl font-bold">Product passports</h2>
              {products.length === 0 ? (
                <div className="mt-4"><EmptyState manufacturer={isManufacturer} /></div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {products.map((product) => (
                    <article key={product.productId || product._id} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-green-300">
                      <Link to={`/passport/${encodeURIComponent(product.productId)}`} className="block">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.productId}</p>
                        <h3 className="mt-2 font-bold">{product.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{product.brand || "Brand not provided"}</p>
                        <p className="mt-3 text-xs capitalize text-amber-800">{product.verificationStatus || "unverified"}</p>
                      </Link>
                      {isManufacturer && <Link to={`/products/${encodeURIComponent(product.productId)}/edit`} className="mt-4 inline-block text-sm font-semibold text-green-900 underline">Edit passport</Link>}
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="text-xl font-bold">Recent activity</h2>
              {activities.length ? (
                <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
                  {activities.map((activity) => (
                    <li key={activity._id} className="py-4">
                      <p className="text-sm font-medium">{activity.description || activity.action || activity.type}</p>
                      <p className="mt-1 text-xs text-slate-500">{activity.createdAt ? new Date(activity.createdAt).toLocaleString() : ""}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No recent product activity.</p>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
