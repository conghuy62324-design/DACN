import {api} from './api';
// WEB-INTEGRATION-04 can consume these without replacing AuthContext or AI panels.
export const AccountService = {
  async updateProfile(input: {fullName?:string;phone?:string|null;bio?:string;avatarUrl?:string|null}) {
    return (await api.patch('/auth/profile',input) as any).data;
  },
  async changePassword(currentPassword:string,newPassword:string):Promise<{reauthRequired:boolean}> {
    const response:any=await api.post('/auth/change-password',{currentPassword,newPassword});
    if(response.data?.reauthRequired){localStorage.removeItem('travelgo_token');localStorage.removeItem('travelgo_user');window.dispatchEvent(new Event('travelgo:unauthorized'));}
    return response.data;
  },
  async notifications(page=1,limit=20) {return (await api.get('/notifications',{params:{page,limit}}) as any).data;},
  async markRead(id:string) {return (await api.patch(`/notifications/${encodeURIComponent(id)}/read`,{}) as any).data;},
  async markAllRead() {return (await api.post('/notifications/read-all',{}) as any).data;},
};
