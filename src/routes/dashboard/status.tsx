import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardOnboardingStatusPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardOnboardingStatusPage")));

export const Route = createFileRoute("/dashboard/status")({
  head: () => privateRouteHead("Status do cadastro"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardOnboardingStatusPage /></ProtectedRoute>),
});
