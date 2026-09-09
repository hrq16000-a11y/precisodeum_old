import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouteGuard from "@/components/dashboard/DashboardRouteGuard";

const DashboardOpenLeadsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardOpenLeadsPage")));

export const Route = createFileRoute("/dashboard/leads-abertos")({
  head: () => privateRouteHead("Leads abertos"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardRouteGuard requiredPermission="leads"><DashboardOpenLeadsPage /></DashboardRouteGuard></ProtectedRoute>),
});
