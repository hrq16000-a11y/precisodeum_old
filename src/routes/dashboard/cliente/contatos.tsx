import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardClientContactsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardClientContactsPage")));

export const Route = createFileRoute("/dashboard/cliente/contatos")({
  head: () => privateRouteHead("Meus contatos"),
  component: () => (<ProtectedRoute><DashboardClientContactsPage /></ProtectedRoute>),
});
