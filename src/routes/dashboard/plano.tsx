import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouteGuard from "@/components/dashboard/DashboardRouteGuard";

const DashboardPlanPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardPlanPage")));

export const Route = createFileRoute("/dashboard/plano")({
  head: () => privateRouteHead("Meu plano"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardRouteGuard requiredPermission="plan"><DashboardPlanPage /></DashboardRouteGuard></ProtectedRoute>),
});
