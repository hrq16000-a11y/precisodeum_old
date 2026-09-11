import { test, expect, Page } from '@playwright/test';

/**
 * Cadastro de serviço + fotos · roteiro mobile
 *
 * Roteiro validado:
 *  1. login → /dashboard/servicos
 *  2. abrir "Novo Serviço" e publicar com dados mínimos
 *  3. anexar uma foto no uploader pós-publicação
 *  4. abrir o serviço na lista e voltar sem erro de página
 *
 * Requer credenciais reais de um prestador aprovado:
 *  - E2E_USER_EMAIL
 *  - E2E_USER_PASSWORD
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;

// 1x1 PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').first().fill(EMAIL!);
  await page.locator('input[type="password"]').first().fill(PASSWORD!);
  await page.locator('button[type="submit"]').first().click();
  await expect.poll(() => page.url(), { timeout: 20_000 }).not.toMatch(/\/login(\b|\?)/);
}

test.describe('Serviço + fotos no celular', () => {
  test.skip(!EMAIL || !PASSWORD, 'Defina E2E_USER_EMAIL e E2E_USER_PASSWORD');
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(120_000);

  test('cria serviço, anexa foto e volta para a lista sem erro', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await login(page);
    await page.goto('/dashboard/servicos');

    await page.getByRole('button', { name: /Novo Serviço/i }).first().click();

    const name = `Serviço E2E ${Date.now()}`;
    await page.getByLabel(/Nome do serviço/i).first().fill(name);

    const publish = page.getByRole('button', { name: /Publicar|Salvar/i }).first();
    await expect(publish).toBeEnabled({ timeout: 15_000 });
    await publish.click();

    // Uploader pós-publicação
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 20_000 });
    await fileInput.setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: TINY_PNG });

    await expect(page.getByText(/foto.*enviada com sucesso/i)).toBeVisible({ timeout: 45_000 });

    // Concluir e voltar para a lista
    await page.getByRole('button', { name: /Concluir/i }).first().click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 20_000 });

    expect(pageErrors, `erros de página: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });
});
