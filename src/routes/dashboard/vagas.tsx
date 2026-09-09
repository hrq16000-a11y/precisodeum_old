import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouteGuard from "@/components/dashboard/DashboardRouteGuard";

const DashboardJobsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardJobsPage")));

export const Route = createFileRoute("/dashboard/vagas")({
  head: () => privateRouteHead("Minhas vagas"),
  component: () => (<ProtectedRoute allowedTypes={['provider', 'rh']}><DashboardRouteGuard requiredPermission="jobs"><DashboardJobsPage /></DashboardRouteGuard></ProtectedRoute>),
});
