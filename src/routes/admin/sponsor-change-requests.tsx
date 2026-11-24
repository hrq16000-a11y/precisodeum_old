import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

const AdminSponsorChangeRequestsPage = reactLazy(() => importWithRetry(() => import("@/pages/AdminSponsorChangeRequestsPage")));

export const Route = createFileRoute("/admin/sponsor-change-requests")({
  head: () => ({ meta: [
    { title: 'Solicitações de patrocinadores | Preciso de um Profissional' },
    { name: 'description', content: 'Revisão privada de alterações solicitadas por patrocinadores do Preciso de um Profissional.' },
    { property: 'og:title', content: 'Solicitações de patrocinadores | Preciso de um Profissional' },
    { property: 'og:description', content: 'Revisão privada de alterações de patrocinadores.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: () => (<AdminGuard><RouteErrorBoundary sectionName="AdminSponsorChangeRequestsPage"><AdminSponsorChangeRequestsPage /></RouteErrorBoundary></AdminGuard>),
});
