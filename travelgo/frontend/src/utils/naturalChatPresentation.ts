/** Name is supplied only by AuthContext after auth/me/login, never the chat payload/cache. */
export function authenticatedGreeting(name?: string) {
 const safe=typeof name==='string'&&/^[\p{L}\p{M} '\-]{1,70}$/u.test(name.trim())?name.trim().replace(/\s+/g,' '):'';
 return `Xin chào${safe?' '+safe:''}! Mình là trợ lý du lịch TravelGo. Mình có thể giúp bạn tìm khách sạn, nhà hàng và lên kế hoạch chuyến đi. Bạn muốn khám phá nơi nào?`;
}
export function naturalChatError(error:any){
 if(/OLLAMA|PROVIDER_NOT_CONFIGURED|PROVIDER_ERROR|PROVIDER_QUOTA/.test(error?.code||''))return 'AI hiểu ngôn ngữ đang chưa sẵn sàng. Mình chưa thay đổi chuyến đi. Bạn có thể thử lại bằng một yêu cầu mới sau hoặc tiếp tục với thông tin cụ thể.';
 if(error?.code==='AGENT_TIMEOUT')return 'AI đang phản hồi chậm nên yêu cầu này đã dừng. Mình không tự gửi lại hoặc đặt dịch vụ.';
 if(/INVALID_PROVIDER|UNVERIFIED_TOOL|UNGROUNDED/.test(error?.code||''))return 'Mình chưa hiểu chắc yêu cầu nên chưa tự thay đổi thông tin. Bạn diễn đạt lại giúp mình nhé.';
 if(/RATE_LIMITED/.test(error?.code||''))return 'Bạn đã dùng hết lượt hỗ trợ trong giờ này. Hãy quay lại sau nhé.';
 return 'Mình chưa hoàn thành được yêu cầu. Bạn kiểm tra lựa chọn hoặc bắt đầu cuộc trò chuyện mới nhé.';
}
