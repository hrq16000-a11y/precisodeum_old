import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouteGuard from "@/components/dashboard/DashboardRouteGuard";

const DashboardLeadDetailPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardLeadDetailPage")));

export const Route = createFileRoute("/dashboard/leads/$leadId")({
  head: () => privateRouteHead("Detalhe do lead"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardRouteGuard requiredPermission="leads"><DashboardLeadDetailPage /></DashboardRouteGuard></ProtectedRoute>),
});
