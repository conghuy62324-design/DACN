import { api } from './api';

export type PartnerResource = 'places' | 'tours' | 'tickets' | 'blogs';
export type ModeratedResource = 'places' | 'tours' | 'blogs';
export interface PagedResult<T = any> { items: T[]; total: number; page: number; limit: number; pages?: number; }

export const ManagementService = {
  async partnerList(resource: PartnerResource, params: Record<string, unknown> = {}): Promise<PagedResult> {
    const response: any = await api.get(`/partner/${resource}`, { params });
    return response.data;
  },
  async partnerGet(resource: PartnerResource, id: string): Promise<any> {
    const response: any = await api.get(`/partner/${resource}/${id}`);
    return response.data;
  },
  async partnerSave(resource: PartnerResource, payload: Record<string, unknown>, id?: string): Promise<any> {
    const response: any = id ? await api.patch(`/partner/${resource}/${id}`, payload) : await api.post(`/partner/${resource}`, payload);
    return response.data;
  },
  async partnerDelete(resource: PartnerResource, id: string): Promise<any> {
    const response: any = await api.delete(`/partner/${resource}/${id}`);
    return response.data;
  },
  async partnerSubmit(resource: Exclude<PartnerResource, 'tickets'>, id: string): Promise<any> {
    const response: any = await api.post(`/partner/${resource}/${id}/submit`);
    return response.data;
  },
  async partnerBookings(businessId: string): Promise<PagedResult> {
    const response: any = await api.get('/partner/bookings', { params: { businessId } });
    return response.data;
  },
  async partnerBooking(id: string): Promise<any> {
    const response: any = await api.get(`/partner/bookings/${id}`);
    return response.data;
  },
  async partnerBookingStatus(id: string, businessId: string, status: string, reason?: string): Promise<any> {
    const response: any = await api.patch(`/partner/bookings/${id}/status`, { businessId, status, reason });
    return response.data;
  },
  async adminList(resource: ModeratedResource, params: Record<string, unknown> = {}): Promise<PagedResult> {
    const response: any = await api.get(`/admin/${resource}`, { params });
    return response.data;
  },
  async adminGet(resource: ModeratedResource, id: string): Promise<any> {
    const response: any = await api.get(`/admin/${resource}/${id}`);
    return response.data;
  },
  async moderate(resource: ModeratedResource, id: string, status: string, reason?: string): Promise<any> {
    const response: any = await api.patch(`/admin/${resource}/${id}/status`, { status, reason });
    return response.data;
  },
};
