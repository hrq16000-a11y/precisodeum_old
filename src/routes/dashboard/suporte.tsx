import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardSupportPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardSupportPage")));

export const Route = createFileRoute("/dashboard/suporte")({
  head: () => privateRouteHead("Suporte"),
  component: () => (<ProtectedRoute><DashboardSupportPage /></ProtectedRoute>),
});
