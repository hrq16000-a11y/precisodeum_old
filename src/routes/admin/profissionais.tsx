import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias amigável: /admin/profissionais → painel de prestadores já existente. */
export const Route = createFileRoute("/admin/profissionais")({
  beforeLoad: () => {
    throw redirect({ href: "/admin/prestadores", replace: true });
  },
});
