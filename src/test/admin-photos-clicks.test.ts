import { describe, it, expect } from 'vitest';
import { isPubliclyListed } from '@/pages/AdminServicePhotosPage';
import { bucketize } from '@/pages/AdminAdClicksPage';

describe('admin fotos', () => {
  it('foto só é pública quando profissional aprovado e serviço não removido', () => {
    expect(isPubliclyListed({ provider_status: 'approved', deleted: false, image_url: 'x' })).toBe(true);
    expect(isPubliclyListed({ provider_status: 'pending', deleted: false, image_url: 'x' })).toBe(false);
    expect(isPubliclyListed({ provider_status: 'approved', deleted: true, image_url: 'x' })).toBe(false);
  });
});
describe('admin cliques', () => {
  it('agrupa cliques e ordena do maior para o menor', () => {
    const r = bucketize([{ c: 'Curitiba' }, { c: 'Curitiba' }, { c: null }], (x) => x.c);
    expect(r[0]).toEqual({ key: 'Curitiba', total: 2 });
    expect(r[1]).toEqual({ key: 'Não informado', total: 1 });
  });
});
