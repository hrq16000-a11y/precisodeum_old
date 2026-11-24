import { createFileRoute } from "@tanstack/react-router";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import AdminGuard from "@/components/AdminGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

const AdminPortabilityPage = reactLazy(() => importWithRetry(() => import("@/pages/AdminPortabilityPage")));

export const Route = createFileRoute("/admin/portabilidade/")({
  head: () => ({ meta: [
    { title: 'Portabilidade e auditoria | Preciso de um Profissional' },
    { name: 'description', content: 'Relatórios de auditoria e portabilidade do Preciso de um Profissional.' },
    { property: 'og:title', content: 'Portabilidade e auditoria | Preciso de um Profissional' },
    { property: 'og:description', content: 'Relatórios privados de auditoria e portabilidade.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: () => (<AdminGuard><RouteErrorBoundary sectionName="AdminPortabilityPage"><AdminPortabilityPage /></RouteErrorBoundary></AdminGuard>),
});
