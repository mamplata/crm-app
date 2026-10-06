import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export type CrmItem = Record<string, unknown> & { id: string };
export type CrmList = { items: CrmItem[]; total: number; page: number; per_page: number };

@Injectable({ providedIn: 'root' })
export class CrmService {
  constructor(private readonly api: ApiService) {}

  list(resource: string): Promise<CrmList> {
    return firstValueFrom(this.api.get<CrmList>(resource, { per_page: '50', direction: 'DESC' }));
  }

  create(resource: string, value: object): Promise<CrmItem> {
    return firstValueFrom(this.api.post<{ item: CrmItem }>(resource, value)).then((response) => response.item);
  }

  update(resource: string, id: string, value: object): Promise<CrmItem> {
    return firstValueFrom(this.api.patch<{ item: CrmItem }>(`${resource}/${id}`, value)).then((response) => response.item);
  }

  remove(resource: string, id: string): Promise<void> {
    return firstValueFrom(this.api.delete(`${resource}/${id}`));
  }
}
