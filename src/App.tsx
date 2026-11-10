import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import InboxPage from "@/pages/InboxPage";
import { AppProvider } from "@/state/AppProvider";

// Chart-heavy pages are lazy so Recharts stays out of the initial bundle.
const IncidentPage = lazy(() => import("@/pages/IncidentPage"));
const RulesPage = lazy(() => import("@/pages/RulesPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<InboxPage />} />
            <Route path="incident/:id" element={<IncidentPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </AppProvider>
  );
}
