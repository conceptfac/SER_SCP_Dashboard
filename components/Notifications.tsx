import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { TRANSLATIONS } from '../constants';

export interface Notification {
  id: string;
  recipient_id?: string;
  target_role?: number;
  sender_id?: string;
  type: 'archive_client' | 'archive_contract' | 'withdrawal_request' | 'scp_info' | 'generic';
  title: string;
  message: string;
  related_entity_id?: string;
  link?: string;
  status: 'unread' | 'read' | 'accepted' | 'denied';
  created_at: string;
}

interface NotificationsProps {
  user: User;
  onNavigate?: (view: string, params?: any) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ user, onNavigate, language = 'pt-br' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  // @ts-ignore
  const t = TRANSLATIONS[language];

  const getDbRole = (role: any): number => {
    // Se o role já for um número (do Enum UserRole), retorna ele mesmo
    if (typeof role === 'number') return role;

    // Mapeia o role do usuário (string/enum) para o inteiro esperado pelo banco
    if (role === 'HEAD') return 0;
    if (role === 'Executivo Leader' || role === 'Executivo Líder') return 1;
    if (role === 'Executivo') return 2;
    if (role === 'Financeiro') return 3;
    if (role === 'Cliente') return 4;
    return -1;
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        // Busca notificações diretas OU por role
        .or(`recipient_id.eq.${user.id},target_role.eq.${getDbRole(user.role)}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter((n: Notification) => n.status === 'unread').length || 0);

      // Buscar nomes para notificações baseadas em ID
      if (data && data.length > 0) {
        const execIds = data.filter(n => n.type === 'archive_client').map(n => n.sender_id).filter(Boolean);
        const clientIds = data.filter(n => n.type === 'archive_client').map(n => n.related_entity_id).filter(Boolean);
        
        const newNames: Record<string, string> = {};

        if (execIds.length > 0) {
            const { data: execs } = await supabase.from('executives').select('id, full_name').in('id', execIds);
            execs?.forEach((e: any) => newNames[e.id] = e.full_name);
        }

        if (clientIds.length > 0) {
            const { data: clients } = await supabase.from('customers').select('id, full_name, company_name, customer_type').in('id', clientIds);
            clients?.forEach((c: any) => newNames[c.id] = c.customer_type === 'PJ' ? c.company_name : c.full_name);
        }

        setEntityNames(prev => ({ ...prev, ...newNames }));
      }

    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Opcional: Configurar realtime subscription aqui
    const subscription = supabase
      .channel('notifications_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.id, user.role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notification: Notification) => {
    if (notification.status === 'unread') {
      await supabase.from('notifications').update({ status: 'read' }).eq('id', notification.id);
      fetchNotifications();
    }
  };

  const handleAction = async (notification: Notification, action: 'accepted' | 'denied') => {
    try {
      // 1. Atualiza o status da notificação
      await supabase.from('notifications').update({ status: action }).eq('id', notification.id);

      // 2. Executa a lógica de negócio baseada no tipo
      if (action === 'accepted') {
        if (notification.type === 'archive_client' && notification.related_entity_id) {
          // Lógica real de arquivamento
          await supabase.from('customers').update({ account_status: 'archived' }).eq('id', notification.related_entity_id);
          alert('Cliente arquivado com sucesso.');
        }
        // Adicione outros casos aqui (archive_contract, etc)
      }

      fetchNotifications();
    } catch (error) {
      console.error('Erro ao processar ação:', error);
      alert('Erro ao processar solicitação.');
    }
  };

  const handleView = (notification: Notification) => {
    markAsRead(notification);
    setIsOpen(false);

    if (notification.type === 'generic' && notification.link) {
      window.open(notification.link, '_blank');
    } else if (onNavigate) {
      // Mapeia o tipo de notificação para a view correta
      switch (notification.type) {
        case 'archive_client':
          onNavigate('clients', { openClientId: notification.related_entity_id, timestamp: Date.now() });
          break;
        case 'archive_contract':
        case 'withdrawal_request':
          onNavigate('contracts', { openContractId: notification.related_entity_id, timestamp: Date.now() });
          break;
        case 'scp_info':
          onNavigate('scp-info');
          break;
      }
    }
  };

  const getNotificationContent = (notification: Notification) => {
    let title = notification.title;
    let message = notification.message;

    if (notification.type === 'archive_client') {
        title = t.archiveRequestTitle;
        try {
            const data = JSON.parse(notification.message);
            // Suporta formato antigo (nomes diretos) e novo (IDs)
            const execName = data.executive || entityNames[data.executive_id || notification.sender_id] || '...';
            const clientName = data.client || entityNames[data.client_id || notification.related_entity_id] || '...';
            message = t.archiveRequestMessage
                .replace('{executive}', execName)
                .replace('{client}', clientName);
        } catch (e) {
            // Fallback caso a mensagem não seja um JSON válido (legado)
            message = notification.message;
        }
    } else if (notification.type === 'archive_contract') {
        // Lógica similar para contratos
    } else if (notification.type === 'withdrawal_request') {
        // Lógica similar para resgates
    }
    
    // Para 'scp_info' e 'generic', usamos o título e mensagem originais do banco
    // ou podemos adicionar chaves específicas se necessário.

    return { title, message };
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => {
          if (!isOpen) fetchNotifications();
          setIsOpen(!isOpen);
        }}
        className="relative p-2 text-gray-400 hover:text-secondary hover:bg-gray-50 rounded-full transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-sm font-bold text-secondary uppercase tracking-wider">{t.notifications}</h3>
            <button onClick={fetchNotifications} className="text-xs text-primary hover:underline">Atualizar</button>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                Nenhuma notificação no momento.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notification => {
                  const content = getNotificationContent(notification);
                  return (
                  <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors ${notification.status === 'unread' ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notification.status === 'unread' ? 'bg-primary' : 'bg-gray-200'}`}></div>
                      <div className="flex-1">
                        <div 
                          className="cursor-pointer group" 
                          onClick={() => handleView(notification)}
                        >
                          <p className="text-xs font-bold text-secondary mb-1 group-hover:text-primary transition-colors">{content.title}</p>
                          <p className="text-[11px] text-bodyText leading-relaxed mb-3">{content.message}</p>
                        </div>
                        
                        {/* Ações baseadas no status */}
                        {notification.status === 'unread' || notification.status === 'read' ? (
                          <div className="flex gap-2 mt-2 justify-end">
                            {(notification.type === 'archive_client' || notification.type === 'archive_contract' || notification.type === 'withdrawal_request') && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleAction(notification, 'accepted'); }}
                                  className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-100 text-[10px] font-bold rounded-lg hover:bg-green-100 transition-colors uppercase tracking-wide"
                                >
                                  {t.accept}
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleAction(notification, 'denied'); }}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-colors uppercase tracking-wide"
                                >
                                  {t.deny}
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider ${
                              notification.status === 'accepted' 
                                ? 'bg-green-50 text-green-600 border-green-100' 
                                : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                              {notification.status === 'accepted' ? t.requestAccepted : t.requestDenied}
                            </span>
                          </div>
                        )}
                        <p className="text-[9px] text-gray-300 mt-2 text-right">{new Date(notification.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
