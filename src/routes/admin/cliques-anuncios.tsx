import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";

const Page = reactLazy(() => importWithRetry(() => import("@/pages/AdminAdClicksPage")));

export const Route = createFileRoute("/admin/cliques-anuncios")({
  head: () => privateRouteHead("Admin · Cliques nos anúncios"),
  component: () => (
    <AdminGuard>
      <RouteErrorBoundary sectionName="AdminAdClicksPage">
        <Page />
      </RouteErrorBoundary>
    </AdminGuard>
  ),
});
