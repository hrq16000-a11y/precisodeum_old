import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardIdentitySuggestionsPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardIdentitySuggestionsPage")));

export const Route = createFileRoute("/dashboard/sugestoes-identidade")({
  head: () => ({ meta: [
    ...privateRouteHead("Sugestões de identidade").meta,
    { property: 'og:title', content: 'Sugestões de identidade | Preciso de um Profissional' },
    { property: 'og:description', content: 'Revisão privada de sugestões para seu perfil.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => (<ProtectedRoute><DashboardIdentitySuggestionsPage /></ProtectedRoute>),
});
