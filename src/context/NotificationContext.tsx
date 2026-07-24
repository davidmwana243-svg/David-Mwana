import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotificationOverlay } from '../components/NotificationOverlay';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationContextType {
  showNotification: (title: string, message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<{
    isVisible: boolean;
    title: string;
    message: string;
    type: NotificationType;
  }>({
    isVisible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showNotification = React.useCallback((title: string, message: string, type: NotificationType) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setNotification({ isVisible: true, title, message, type });
    
    timeoutRef.current = setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
      timeoutRef.current = null;
    }, 5000);
  }, []);

  React.useEffect(() => {
    const handleFCMMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { title, body } = customEvent.detail;
        showNotification(title || 'DavidSTORE', body || '', 'info');
      }
    };
    window.addEventListener('fcm-foreground-message', handleFCMMessage);
    return () => {
      window.removeEventListener('fcm-foreground-message', handleFCMMessage);
    };
  }, [showNotification]);

  const value = React.useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationOverlay
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
