import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import SponsorProtectedRoute from "@/components/SponsorProtectedRoute";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

const SponsorSelfServicePage = reactLazy(() => importWithRetry(() => import("@/pages/sponsor/SponsorSelfServicePage")));

export const Route = createFileRoute("/sponsor-panel/editar")({
  head: () => ({ meta: [
    { title: 'Editar campanha | Preciso de um Profissional' },
    { name: 'description', content: 'Solicitações privadas de alterações e histórico da campanha.' },
    { property: 'og:title', content: 'Editar campanha | Preciso de um Profissional' },
    { property: 'og:description', content: 'Solicitações privadas de alterações e histórico da campanha.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: () => (<SponsorProtectedRoute><RouteErrorBoundary sectionName="SponsorSelfServicePage"><SponsorSelfServicePage /></RouteErrorBoundary></SponsorProtectedRoute>),
});
