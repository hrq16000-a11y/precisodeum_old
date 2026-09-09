import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardPrivacyPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardPrivacyPage")));

export const Route = createFileRoute("/dashboard/privacidade")({
  head: () => privateRouteHead("Privacidade"),
  component: () => (<ProtectedRoute><DashboardPrivacyPage /></ProtectedRoute>),
});
