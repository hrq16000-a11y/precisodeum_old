import { Lightbulb, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getTemplatesForCategory } from '@/data/serviceTemplates';

interface ServiceFillAssistantProps {
  categorySlug?: string;
  categoryName?: string;
  cityName?: string;
  serviceName: string;
  onApply: (title: string, description: string) => void;
}

export default function ServiceFillAssistant({
  categorySlug,
  categoryName,
  cityName,
  serviceName,
  onApply,
}: ServiceFillAssistantProps) {
  const [open, setOpen] = useState(false);
  const templates = useMemo(
    () => (categorySlug ? getTemplatesForCategory(categorySlug) : []),
    [categorySlug],
  );

  const applyBasicText = () => {
    const category = categoryName || serviceName.trim() || 'serviços profissionais';
    const city = cityName?.trim() ? ` em ${cityName.trim()}` : '';
    onApply(
      serviceName.trim() || category,
      `Atendimento de ${category}${city}. Explique o serviço que você precisa para combinar diretamente os detalhes, o melhor horário e as condições do atendimento.`,
    );
    setOpen(false);
  };

  return (
    <section className="rounded-lg border border-accent/40 bg-accent/10 p-3" aria-labelledby="fill-assistant-title">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <WandSparkles className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 id="fill-assistant-title" className="text-sm font-bold text-foreground">Precisa de ajuda para preencher?</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Escolha uma opção e nós preenchemos o título e a descrição para você revisar.
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="accent"
        className="mt-3 min-h-11 w-full gap-2"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="service-fill-assistant-options"
      >
        <WandSparkles className="size-4" aria-hidden="true" />
        {open ? 'Fechar ajuda' : 'Preencher com ajuda'}
      </Button>

      {open && (
        <div id="service-fill-assistant-options" className="mt-3 space-y-2" role="region" aria-label="Sugestões de preenchimento">
          {!categorySlug && (
            <div className="flex items-start gap-2 rounded-md bg-background p-3 text-xs text-foreground">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <p>Escolha primeiro a categoria do serviço. Depois mostraremos sugestões prontas.</p>
            </div>
          )}

          {templates.map((template) => (
            <Button
              key={template.label}
              type="button"
              variant="outline"
              className="h-auto min-h-12 w-full justify-start whitespace-normal px-3 py-2 text-left"
              onClick={() => {
                onApply(serviceName.trim() || template.label, template.description);
                setOpen(false);
              }}
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">{template.label}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs font-normal text-muted-foreground">{template.description}</span>
              </span>
            </Button>
          ))}

          {categorySlug && templates.length === 0 && (
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={applyBasicText}>
              Criar um texto básico para {categoryName || 'esta categoria'}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}