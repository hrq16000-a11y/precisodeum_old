import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";


export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'Preciso de um Profissional | Serviços no Brasil' },
    { name: 'description', content: 'Encontre um profissional para qualquer tipo de serviço no Brasil. Negocie diretamente com profissionais da sua região.' },
    { property: 'og:title', content: 'Preciso de um Profissional | Serviços no Brasil' },
    { property: 'og:description', content: 'Encontre profissionais da sua região e negocie diretamente.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => (<Index />),
});
