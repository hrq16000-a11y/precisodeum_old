import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardCadastroStatusPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardCadastroStatusPage")));

export const Route = createFileRoute("/dashboard/cadastro-status")({
  head: () => privateRouteHead("Status do cadastro"),
  component: () => (<ProtectedRoute><DashboardCadastroStatusPage /></ProtectedRoute>),
});
