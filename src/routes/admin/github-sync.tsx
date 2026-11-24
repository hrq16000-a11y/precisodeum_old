import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";

const Page = reactLazy(() => importWithRetry(() => import("@/pages/AdminGithubSyncPage")));

export const Route = createFileRoute("/admin/github-sync")({
  head: () => privateRouteHead("Admin · Envio para o GitHub"),
  component: () => (
    <AdminGuard>
      <RouteErrorBoundary sectionName="AdminGithubSyncPage">
        <Page />
      </RouteErrorBoundary>
    </AdminGuard>
  ),
});
