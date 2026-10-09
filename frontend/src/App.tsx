import { Routes, Route, Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import PublicLayout from "@/components/PublicLayout";
import Home from "@/pages/Home";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Feedback";
const Catalog = lazy(() => import("@/pages/Catalog"));
const PropertyDetail = lazy(() => import("@/pages/PropertyDetail"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const Login = lazy(() => import("@/pages/admin/Login"));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const Properties = lazy(() => import("@/pages/admin/Properties"));
const PropertyEditor = lazy(() => import("@/pages/admin/PropertyEditor"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
function NotFound() {
  return (
    <div className="empty not-found">
      <span className="eyebrow">404</span>
      <h1>Este caminho não leva a um imóvel.</h1>
      <p>Volte ao catálogo para encontrar seu próximo lugar.</p>
      <Button asChild>
        <Link to="/imoveis">Ver imóveis</Link>
      </Button>
    </div>
  );
}
export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="imoveis" element={<Catalog />} />
          <Route path="imoveis/:slug" element={<PropertyDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin/login" element={<Login />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="imoveis" element={<Properties />} />
          <Route path="imoveis/novo" element={<PropertyEditor />} />
          <Route path="imoveis/:id" element={<PropertyEditor />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
