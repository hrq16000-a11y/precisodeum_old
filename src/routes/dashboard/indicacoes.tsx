import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardReferralsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardReferralsPage")));

export const Route = createFileRoute("/dashboard/indicacoes")({
  head: () => privateRouteHead("Indicações"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardReferralsPage /></ProtectedRoute>),
});
