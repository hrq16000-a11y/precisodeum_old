import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorGuard from "@/components/ErrorGuard";

const DashboardPortfolioPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardPortfolioPage")));

export const Route = createFileRoute("/dashboard/portfolio")({
  head: () => privateRouteHead("Portfólio"),
  component: () => (<ProtectedRoute allowedTypes={['provider']}><ErrorGuard componentName="DashboardPortfolioPage"><DashboardPortfolioPage /></ErrorGuard></ProtectedRoute>),
});
