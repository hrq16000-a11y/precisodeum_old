import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardRankingPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardRankingPage")));

export const Route = createFileRoute("/dashboard/ranking")({
  head: () => privateRouteHead("Ranking"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardRankingPage /></ProtectedRoute>),
});
