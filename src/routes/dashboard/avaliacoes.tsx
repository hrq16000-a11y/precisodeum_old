import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouteGuard from "@/components/dashboard/DashboardRouteGuard";

const DashboardReviewsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardReviewsPage")));

export const Route = createFileRoute("/dashboard/avaliacoes")({
  head: () => privateRouteHead("Avaliações"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardRouteGuard requiredPermission="reviews"><DashboardReviewsPage /></DashboardRouteGuard></ProtectedRoute>),
});
