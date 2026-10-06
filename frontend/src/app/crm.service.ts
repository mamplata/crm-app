import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export type CrmItem = Record<string, unknown> & { id: string };
export type CrmList = { items: CrmItem[]; total: number; page: number; per_page: number };

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly cache = new Map<string, { expires: number; value: CrmList }>();

  constructor(private readonly api: ApiService) {}

  async list(resource: string): Promise<CrmList> {
    const cached = this.cache.get(resource);
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = await firstValueFrom(this.api.get<CrmList>(resource, { per_page: '50', direction: 'DESC' }));
    this.cache.set(resource, { value, expires: Date.now() + 30_000 });
    return value;
  }

  async create(resource: string, value: object): Promise<CrmItem> {
    const response = await firstValueFrom(this.api.post<{ item: CrmItem }>(resource, value));
    this.cache.delete(resource);
    return response.item;
  }

  async update(resource: string, id: string, value: object): Promise<CrmItem> {
    const response = await firstValueFrom(this.api.patch<{ item: CrmItem }>(`${resource}/${id}`, value));
    this.cache.delete(resource);
    return response.item;
  }

  async remove(resource: string, id: string): Promise<void> {
    await firstValueFrom(this.api.delete(`${resource}/${id}`));
    this.cache.delete(resource);
  }
}
