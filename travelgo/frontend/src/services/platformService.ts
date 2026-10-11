import { Business, PartnerApplication, PartnerApplicationStatus } from '../types';
import { api } from './api';

export interface AdminDashboardData {
  totalUsers: number;
  totalCustomers: number;
  totalPartners: number;
  pendingPartners: number;
  totalBusinesses: number;
  totalHotels: number;
  totalRestaurants: number;
  totalPlaces: number;
  totalTours: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  rejectedBookings: number;
  totalRevenue: number;
  recentActivity: Array<{ id: string; action: string; entityType: string; createdAt: string }>;
  source: 'DATABASE';
  pendingPlaces: number;
  pendingTours: number;
  pendingBlogs: number;
}

export const PlatformService = {
  async getAdminDashboard(): Promise<AdminDashboardData> {
    const response: any = await api.get('/admin/dashboard');
    return response.data;
  },

  async getPartnerApplications(status?: PartnerApplicationStatus): Promise<{ items: PartnerApplication[]; total: number }> {
    const response: any = await api.get('/admin/partner-applications', { params: status ? { status } : undefined });
    return response.data;
  },

  async decidePartnerApplication(id: string, status: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO', reason?: string) {
    const response: any = await api.patch(`/admin/partners/${id}/approval`, { status, reason });
    return response.data;
  },

  async submitPartnerApplication(input: Record<string, unknown>): Promise<PartnerApplication> {
    const response: any = await api.post('/partner-applications', input);
    return response.data;
  },

  async getMyPartnerApplications(): Promise<PartnerApplication[]> {
    const response: any = await api.get('/partner-applications/me');
    return response.data;
  },

  async getPartnerDashboard(businessId?: string): Promise<{
    businesses: Business[];
    selectedBusiness: Business | null;
    metrics: null | { totalBookings: number; pendingBookings: number; confirmedBookings: number; completedBookings: number; revenue: number; places: number; tours: number; tickets: number; blogs: number; source: 'DATABASE' };
  }> {
    const response: any = await api.get('/partner/dashboard', { params: businessId ? { businessId } : undefined });
    return response.data;
  },
};
