import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

const AdminSignupFunnelStepsPage = reactLazy(() =>
  importWithRetry(() => import("@/pages/admin/AdminSignupFunnelStepsPage")),
);

export const Route = createFileRoute("/admin/funil-cadastro")({
  component: () => (
    <AdminGuard>
      <RouteErrorBoundary sectionName="AdminSignupFunnelStepsPage">
        <AdminSignupFunnelStepsPage />
      </RouteErrorBoundary>
    </AdminGuard>
  ),
});
