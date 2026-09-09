import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardNotificationsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardNotificationsPage")));

export const Route = createFileRoute("/dashboard/notificacoes/")({
  head: () => privateRouteHead("Notificações"),
  component: () => (<ProtectedRoute><DashboardNotificationsPage /></ProtectedRoute>),
});
