import api from '@/lib/api';

export interface Message {
  id: number;
  sender_id?: number;
  sender_name?: string;
  sender_role?: string;
  recipient_id?: number;
  recipient_name?: string;
  recipient_role?: string;
  subject: string;
  content: string;
  message_type: string;
  is_read: boolean;
  is_starred?: boolean;
  parent_id?: number | null;
  created_at: string;
  read_at?: string | null;
}

export interface MessageStats {
  inbox_total: number;
  inbox_unread: number;
  sent_total: number;
  starred: number;
}

export const messageService = {
  send: async (data: {
    recipient_id?: number | null;
    subject: string;
    content: string;
    message_type?: string;
    parent_id?: number;
  }): Promise<any> => {
    const response = await api.post('/api/v1/messages/', data);
    return response.data;
  },

  // ✅ NOUVEAU : Envoi groupé
  broadcast: async (data: {
    target_type: string;  // all_students, all_staff, all_teachers, all_secretaries, all_admins, individual
    recipient_id?: number | null;
    subject: string;
    content: string;
  }): Promise<any> => {
    const response = await api.post('/api/v1/messages/broadcast', data);
    return response.data;
  },

  getInbox: async (page: number = 1, unreadOnly: boolean = false): Promise<any> => {
    const response = await api.get('/api/v1/messages/inbox', {
      params: { page, unread_only: unreadOnly }
    });
    return response.data;
  },

  getSent: async (page: number = 1): Promise<any> => {
    const response = await api.get('/api/v1/messages/sent', { params: { page } });
    return response.data;
  },

  markAsRead: async (messageId: number): Promise<any> => {
    const response = await api.put(`/api/v1/messages/${messageId}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<any> => {
    const response = await api.put('/api/v1/messages/mark-all-read');
    return response.data;
  },

  toggleStar: async (messageId: number): Promise<any> => {
    const response = await api.put(`/api/v1/messages/${messageId}/star`);
    return response.data;
  },

  delete: async (messageId: number): Promise<any> => {
    const response = await api.delete(`/api/v1/messages/${messageId}`);
    return response.data;
  },

  getStats: async (): Promise<MessageStats> => {
    const response = await api.get('/api/v1/messages/stats');
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await api.get('/api/v1/messages/unread');
    return response.data;
  },

  getUsers: async (): Promise<any[]> => {
    const response = await api.get('/api/v1/messages/users');
    return Array.isArray(response.data) ? response.data : [];
  }
};

export default messageService;