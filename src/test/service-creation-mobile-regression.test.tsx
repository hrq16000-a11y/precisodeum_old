import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceFillAssistant from '@/components/dashboard/ServiceFillAssistant';
import { computeAdScore, lintServiceDescription, shouldBlockByLeilao } from '@/lib/serviceQualityLinter';

describe('cadastro de serviço no celular', () => {
  it('preenche título e descrição sem sair da tela', async () => {
    const user = userEvent.setup();
    let applied: { title: string; description: string } | null = null;
    render(
      <ServiceFillAssistant
        categorySlug="eletricista"
        categoryName="Eletricista"
        cityName="Salvador"
        serviceName=""
        onApply={(title, description) => { applied = { title, description }; }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Preencher com ajuda' }));
    await user.click(screen.getByRole('button', { name: /Instalação de Chuveiro/i }));

    expect(applied?.title).toBe('Instalação de Chuveiro');
    expect(applied?.description.length).toBeGreaterThan(80);
  });

  it('não bloqueia um anúncio mínimo por falta de foto ou descrição', () => {
    const score = computeAdScore({
      description: '',
      cityValidated: true,
      hasOriginalPhoto: false,
      categorySlugs: ['eletricista'],
    });

    expect(score.score).toBeLessThan(50);
    expect(shouldBlockByLeilao(score.forbiddenHits)).toBe(false);
  });

  it('bloqueia somente excesso real de termos de leilão', () => {
    const warning = lintServiceDescription('Faço orçamento para seu serviço.');
    const blocked = lintServiceDescription('barato, desconto, promoção e preço baixo');

    expect(shouldBlockByLeilao(warning)).toBe(false);
    expect(shouldBlockByLeilao(blocked)).toBe(true);
  });
});