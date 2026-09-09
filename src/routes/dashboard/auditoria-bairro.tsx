import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardBadgeAuditPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardBadgeAuditPage")));

export const Route = createFileRoute("/dashboard/auditoria-bairro")({
  head: () => privateRouteHead("Auditoria de bairro"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardBadgeAuditPage /></ProtectedRoute>),
});
