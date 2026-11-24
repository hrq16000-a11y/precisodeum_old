import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

const AdminPortabilityDetailsPage = reactLazy(() => importWithRetry(() => import("@/pages/AdminPortabilityDetailsPage")));

export const Route = createFileRoute("/admin/portabilidade/detalhes")({
  head: () => ({ meta: [
    { title: 'Saúde da estrutura | Preciso de um Profissional' },
    { name: 'description', content: 'Verificação estrutural e histórico privado do Preciso de um Profissional.' },
    { property: 'og:title', content: 'Saúde da estrutura | Preciso de um Profissional' },
    { property: 'og:description', content: 'Verificação estrutural e histórico privado.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: () => (<AdminGuard><RouteErrorBoundary sectionName="AdminPortabilityDetailsPage"><AdminPortabilityDetailsPage /></RouteErrorBoundary></AdminGuard>),
});
