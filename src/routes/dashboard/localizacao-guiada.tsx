import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardLocationGuidedPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardLocationGuidedPage")));

export const Route = createFileRoute("/dashboard/localizacao-guiada")({
  head: () => privateRouteHead("Localização guiada"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><DashboardLocationGuidedPage /></ProtectedRoute>),
});
