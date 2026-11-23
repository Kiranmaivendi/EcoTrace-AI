import { ArrowRight, Bot, Camera, CircleCheck, Leaf, PackageCheck, Recycle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: ShieldCheck, title: "Product identity", description: "Look up product records by passport ID and review the information supplied by its manufacturer." },
  { icon: Leaf, title: "Environmental details", description: "See materials and footprint data only when the passport includes a source and verification status." },
  { icon: Recycle, title: "Repair and recycling", description: "Get product-specific guidance grounded in available passport information." },
  { icon: Bot, title: "AI assistant", description: "Ask questions about a saved passport. Missing facts are called out rather than guessed." }
];

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-900">
              <Leaf size={16} /> AI-powered digital product passport
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-6xl">
              Give Every Product a <span className="text-green-800">Digital Identity.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Explore a product’s origin, materials, maintenance and end-of-life information from one passport. EcoTrace AI presents only the data available in each product record.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/scan" className="inline-flex items-center gap-2 rounded-xl bg-green-800 px-5 py-3.5 font-semibold text-white hover:bg-green-900">
                <Camera size={19} /> Scan QR code
              </Link>
              <Link to="/products" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-800 hover:bg-slate-50">
                Explore products <ArrowRight size={18} />
              </Link>
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl px-5 py-3.5 font-semibold text-green-900 hover:bg-green-50">
                Get started
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-600">No invented verification badges, carbon scores, or AI answers.</p>
          </div>

          <div className="rounded-[2rem] border border-green-100 bg-white p-5 shadow-xl sm:p-8">
            <div className="rounded-3xl bg-green-50 p-6 sm:p-9">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-green-900">Digital Product Passport</p>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">One scan. Clear product facts.</h2>
                </div>
                <PackageCheck className="shrink-0 text-green-800" size={36} />
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Origin and manufacturer", "Materials and warranty", "Verified impact data", "Repair and recycling"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm font-medium text-slate-700">
                    <CircleCheck size={18} className="shrink-0 text-green-700" /> {item}
                  </div>
                ))}
              </div>
              <Link to="/scan" className="mt-6 inline-flex items-center gap-2 font-semibold text-green-900 hover:underline">
                Open scanner <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-green-800">How it works</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">From product to passport</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ["01", "Register", "An authorized manufacturer creates a product record and passport."],
              ["02", "Identify", "A QR code opens the associated passport record."],
              ["03", "Make informed choices", "Review the available information and ask grounded questions."]
            ].map(([number, title, description]) => (
              <article key={number} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="text-sm font-bold text-green-800">{number}</span>
                <h3 className="mt-3 text-xl font-bold">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-green-800">Platform capabilities</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Transparency at every stage</h2>
            <p className="mt-4 leading-7 text-slate-600">Information depends on what the manufacturer has registered. Unverified or unavailable fields are labelled clearly.</p>
          </div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <Icon className="text-green-800" size={26} />
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
