import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardPage")));

export const Route = createFileRoute("/dashboard/")({
  head: () => privateRouteHead("Painel"),
  component: () => (<ProtectedRoute><DashboardPage /></ProtectedRoute>),
});
