import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";

const Page = reactLazy(() => importWithRetry(() => import("@/pages/AdminServicePhotosPage")));

export const Route = createFileRoute("/admin/fotos")({
  head: () => privateRouteHead("Admin · Fotos dos serviços"),
  component: () => (
    <AdminGuard>
      <RouteErrorBoundary sectionName="AdminServicePhotosPage">
        <Page />
      </RouteErrorBoundary>
    </AdminGuard>
  ),
});
