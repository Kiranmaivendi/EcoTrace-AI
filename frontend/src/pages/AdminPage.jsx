import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../api";

export default function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [roleEdits, setRoleEdits] = useState({});
  const [manufacturerEdits, setManufacturerEdits] = useState({});
  const [productEdits, setProductEdits] = useState({});
  const [referenceFiles, setReferenceFiles] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    const [summaryResult, userResult, manufacturerResult, productResult, issueResult] = await Promise.all([
      api.get("/admin/summary"),
      api.get("/admin/users"),
      api.get("/admin/manufacturers"),
      api.get("/admin/products"),
      api.get("/admin/issues")
    ]);
    return {
      summary: summaryResult.data,
      users: userResult.data.users || [],
      manufacturers: manufacturerResult.data.manufacturers || [],
      products: productResult.data.products || [],
      issues: issueResult.data.issues || []
    };
  };

  const applyRecords = (records) => {
    setSummary(records.summary);
    setUsers(records.users);
    setManufacturers(records.manufacturers);
    setProducts(records.products);
    setIssues(records.issues);
  };

  const load = async () => {
    setError("");
    try {
      applyRecords(await fetchRecords());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchRecords()
      .then((records) => { if (active) applyRecords(records); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const runAction = async (action, successMessage) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successMessage);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const updateRole = (user) => runAction(
    () => api.patch(`/admin/users/${user._id}/role`, {
      role: roleEdits[user._id] || user.role,
      manufacturerName: manufacturerEdits[user._id]
    }),
    "User role updated."
  );

  const uploadReference = (manufacturer) => runAction(async () => {
    const file = referenceFiles[manufacturer._id];
    if (!file) throw new Error("Choose a reference image first.");
    const body = new FormData();
    body.append("referenceImage", file);
    await api.patch(`/admin/manufacturers/${manufacturer._id}/reference-image`, body);
  }, "Reference image uploaded. Verify its source before enabling screening.");

  const verifyManufacturer = (manufacturer) => runAction(
    () => api.patch(`/admin/manufacturers/${manufacturer._id}/verification`, {
      isVerified: true,
      source: manufacturerEdits[`${manufacturer._id}-source`] || manufacturer.referenceData?.source || ""
    }),
    "Manufacturer reference marked verified."
  );

  const verifyProduct = (product) => runAction(
    () => api.patch(`/admin/products/${product.productId}/verification`, {
      verificationStatus: productEdits[product.productId]?.verificationStatus || product.verificationStatus,
    carbonVerified: productEdits[product.productId]?.carbonVerified ?? Boolean(product.carbonVerified)
    }),
    "Product verification status updated."
  );

  const updateIssue = (issue, status) => runAction(
    () => api.patch(`/admin/issues/${issue._id}`, { status }),
    "Issue status updated."
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wide text-green-800">Administration</p>
      <h1 className="mt-2 text-3xl font-bold">Platform review</h1>
      <p className="mt-2 text-slate-600">Manage roles and review product and manufacturer records. Mark records verified only after checking the supporting source.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">{message}</p>}
      {loading ? <p className="mt-6">Loading administrative records...</p> : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[["Users", summary?.users], ["Manufacturers", summary?.manufacturers], ["Products", summary?.products]].map(([label, count]) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold">{count ?? 0}</p></article>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="text-xl font-bold">Users and roles</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Email verified</th><th className="p-3">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="p-3">{user.name}<br /><span className="text-slate-500">{user.email}</span></td>
                      <td className="p-3">
                        {user.role === "admin" ? <span className="font-semibold">Admin (protected)</span> : (
                          <>
                            <select value={roleEdits[user._id] || user.role} onChange={(event) => setRoleEdits({ ...roleEdits, [user._id]: event.target.value })} className="rounded-lg border border-slate-300 p-2">
                              <option value="consumer">Consumer</option><option value="manufacturer">Manufacturer</option>
                            </select>
                            {(roleEdits[user._id] || user.role) === "manufacturer" && !user.manufacturer && (
                              <input placeholder="Company name" value={manufacturerEdits[user._id] || ""} onChange={(event) => setManufacturerEdits({ ...manufacturerEdits, [user._id]: event.target.value })} className="mt-2 block w-40 rounded-lg border border-slate-300 p-2" />
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-3">{user.isEmailVerified ? "Yes" : "No"}</td>
                      <td className="p-3">{user.role !== "admin" && <button onClick={() => updateRole(user)} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-50">Save role</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-bold">Manufacturer references</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {manufacturers.map((manufacturer) => (
                <article key={manufacturer._id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-bold">{manufacturer.name}</h3><p className="mt-1 text-sm text-slate-600">Reference status: {manufacturer.referenceData?.verifiedAt ? "verified" : "unverified"}</p></div>
                    <span className="text-xs text-slate-500">{manufacturer.isVerified ? "Manufacturer verified" : "Manufacturer unverified"}</span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setReferenceFiles({ ...referenceFiles, [manufacturer._id]: event.target.files?.[0] || null })} className="mt-4 block w-full text-sm" aria-label={`Reference image for ${manufacturer.name}`} />
                  <button onClick={() => uploadReference(manufacturer)} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Upload reference image</button>
                  <input value={manufacturerEdits[`${manufacturer._id}-source`] ?? manufacturer.referenceData?.source ?? ""} onChange={(event) => setManufacturerEdits({ ...manufacturerEdits, [`${manufacturer._id}-source`]: event.target.value })} placeholder="Reference evidence source" className="mt-3 block w-full rounded-lg border border-slate-300 p-2 text-sm" />
                  <button onClick={() => verifyManufacturer(manufacturer)} className="mt-3 rounded-lg bg-green-800 px-3 py-2 text-sm font-semibold text-white">Verify reference source</button>
                </article>
              ))}
              {manufacturers.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-slate-600">No manufacturer accounts found.</p>}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-bold">Product records</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100"><tr><th className="p-3">Product</th><th className="p-3">Manufacturer</th><th className="p-3">Verification</th><th className="p-3">Carbon verified</th><th className="p-3">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td className="p-3">{product.name}<br /><span className="text-slate-500">{product.productId}</span></td>
                      <td className="p-3">{product.manufacturer?.name || "Not available"}</td>
                      <td className="p-3">
                        <select value={productEdits[product.productId]?.verificationStatus || product.verificationStatus} onChange={(event) => setProductEdits({ ...productEdits, [product.productId]: { ...productEdits[product.productId], verificationStatus: event.target.value } })} className="rounded-lg border border-slate-300 p-2">
                          <option value="unverified">Unverified</option><option value="pending">Pending</option><option value="verified">Verified</option>
                        </select>
                      </td>
                      <td className="p-3"><input type="checkbox" checked={productEdits[product.productId]?.carbonVerified ?? Boolean(product.carbonVerified)} onChange={(event) => setProductEdits({ ...productEdits, [product.productId]: { ...productEdits[product.productId], carbonVerified: event.target.checked } })} aria-label={`Carbon data verified for ${product.name}`} /></td>
                      <td className="p-3"><button onClick={() => verifyProduct(product)} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold">Save status</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-bold">Reported issues</h2>
            {issues.length ? (
              <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {issues.map((issue) => (
                  <div key={issue._id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                    <div><p className="font-semibold">{issue.type} · {issue.product?.name || "Product"}</p><p className="mt-1 text-sm text-slate-600">{issue.description}</p><p className="mt-1 text-xs text-slate-500">Status: {issue.status}</p></div>
                    <select value={issue.status} onChange={(event) => updateIssue(issue, event.target.value)} className="rounded-lg border border-slate-300 p-2" aria-label="Update issue status">
                      <option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No issues have been reported.</p>}
          </section>
        </>
      )}
    </section>
  );
}
