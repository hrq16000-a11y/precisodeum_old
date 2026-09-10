import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

const AdminProviderPerformancePage = reactLazy(() =>
  importWithRetry(() => import("@/pages/admin/AdminProviderPerformancePage")),
);

export const Route = createFileRoute("/admin/desempenho-profissionais")({
  component: () => (
    <AdminGuard>
      <RouteErrorBoundary sectionName="AdminProviderPerformancePage">
        <AdminProviderPerformancePage />
      </RouteErrorBoundary>
    </AdminGuard>
  ),
});
