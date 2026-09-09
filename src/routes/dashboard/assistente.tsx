import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardAssistantPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardAssistantPage")));

export const Route = createFileRoute("/dashboard/assistente")({
  head: () => privateRouteHead("Assistente de revisão"),
  component: () => (<ProtectedRoute><DashboardAssistantPage /></ProtectedRoute>),
});
