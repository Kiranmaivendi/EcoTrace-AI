import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/useAuth";
import AdminPage from "./pages/AdminPage";
import AssistantPage from "./pages/AssistantPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import PassportPage from "./pages/PassportPage";
import ProductRegistrationPage from "./pages/ProductRegistrationPage";
import ProductEditPage from "./pages/ProductEditPage";
import ProductsPage from "./pages/ProductsPage";
import ScannerPage from "./pages/ScannerPage";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-8 text-center text-slate-600">Checking your session...</p>;
  }
  if (!user) {
    return <AuthPage />;
  }
  if (roles && !roles.includes(user.role)) {
    return <p role="alert" className="mx-auto max-w-3xl p-8 text-center text-red-800">You do not have permission to view this page.</p>;
  }
  return children;
}

function PageFrame({ children }) {
  const { error } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      {error && (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
          {error}
        </div>
      )}
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 sm:flex-row">
          <span>EcoTrace AI · Give Every Product a Digital Identity.</span>
          <span>Product facts are shown only when provided and verified.</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PageFrame>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/passport/:productId" element={<PassportPage />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/manufacturer"
          element={<ProtectedRoute roles={["manufacturer", "admin"]}><DashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/products/new"
          element={<ProtectedRoute roles={["manufacturer", "admin"]}><ProductRegistrationPage /></ProtectedRoute>}
        />
        <Route
          path="/products/:productId/edit"
          element={<ProtectedRoute roles={["manufacturer", "admin"]}><ProductEditPage /></ProtectedRoute>}
        />
        <Route
          path="/assistant"
          element={<ProtectedRoute><AssistantPage /></ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={<ProtectedRoute roles={["admin"]}><AdminPage /></ProtectedRoute>}
        />
        <Route path="*" element={<p className="p-12 text-center">Page not found.</p>} />
      </Routes>
    </PageFrame>
  );
}
