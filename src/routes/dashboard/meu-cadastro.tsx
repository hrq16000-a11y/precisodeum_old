import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardMyRegistrationPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardMyRegistrationPage")));

export const Route = createFileRoute("/dashboard/meu-cadastro")({
  head: () => privateRouteHead("Meu cadastro"),
  component: () => (<ProtectedRoute><DashboardMyRegistrationPage /></ProtectedRoute>),
});
