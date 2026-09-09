import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardIdentitySuggestionsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardIdentitySuggestionsPage")));

export const Route = createFileRoute("/dashboard/sugestoes-identidade")({
  head: () => privateRouteHead("Sugestões de identidade"),
  component: () => (<ProtectedRoute><DashboardIdentitySuggestionsPage /></ProtectedRoute>),
});
