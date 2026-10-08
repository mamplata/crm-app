import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export type CrmItem = Record<string, unknown> & { id: string };
export type CrmList = { items: CrmItem[]; total: number; page: number; per_page: number };

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly cache = new Map<string, { expires: number; value: CrmList }>();

  constructor(private readonly api: ApiService) {}

  async list(resource: string, params: Record<string, string> = {}): Promise<CrmList> {
    const cacheKey = `${resource}?${new URLSearchParams(params).toString()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = await firstValueFrom(this.api.get<CrmList>(resource, { per_page: '50', direction: 'DESC', ...params }));
    this.cache.set(cacheKey, { value, expires: Date.now() + 30_000 });
    return value;
  }

  async create(resource: string, value: object): Promise<CrmItem> {
    const response = await firstValueFrom(this.api.post<{ item: CrmItem }>(resource, value));
    this.clearCache(resource);
    return response.item;
  }

  async update(resource: string, id: string, value: object): Promise<CrmItem> {
    const response = await firstValueFrom(this.api.patch<{ item: CrmItem }>(`${resource}/${id}`, value));
    this.clearCache(resource);
    return response.item;
  }

  async remove(resource: string, id: string): Promise<void> {
    await firstValueFrom(this.api.delete(`${resource}/${id}`));
    this.clearCache(resource);
  }

  async retryWebhook(id: string): Promise<CrmItem> {
    const response = await firstValueFrom(this.api.post<{ item: CrmItem }>(`webhook-events/${id}?action=retry`, {}));
    this.clearCache('webhook-events');
    return response.item;
  }

  private clearCache(resource: string): void {
    for (const key of this.cache.keys()) if (key.startsWith(`${resource}?`)) this.cache.delete(key);
  }
}
