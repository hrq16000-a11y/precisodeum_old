import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardNotificationPreferencesPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardNotificationPreferencesPage")));

export const Route = createFileRoute("/dashboard/notificacoes/preferencias")({
  head: () => privateRouteHead("Preferências de notificação"),
  component: () => (<ProtectedRoute><DashboardNotificationPreferencesPage /></ProtectedRoute>),
});
