import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouteGuard from "@/components/dashboard/DashboardRouteGuard";

const DashboardMyPagePage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardMyPagePage")));

export const Route = createFileRoute("/dashboard/minha-pagina")({
  head: () => privateRouteHead("Minha página"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardRouteGuard requiredPermission="my_page"><DashboardMyPagePage /></DashboardRouteGuard></ProtectedRoute>),
});
