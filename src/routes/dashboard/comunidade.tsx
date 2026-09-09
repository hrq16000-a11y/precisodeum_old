import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouteGuard from "@/components/dashboard/DashboardRouteGuard";

const DashboardCommunityPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardCommunityPage")));

export const Route = createFileRoute("/dashboard/comunidade")({
  head: () => privateRouteHead("Comunidade"),
  component: () => (<ProtectedRoute><DashboardRouteGuard requiredPermission="community"><DashboardCommunityPage /></DashboardRouteGuard></ProtectedRoute>),
});
