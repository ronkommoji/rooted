import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationData } from '../lib/notifications';

interface NotificationContextType {
  navigationRef: React.RefObject<NavigationContainerRef<any>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { session, currentGroup } = useAppStore();
  useNotifications(); // Initialize notifications

  useEffect(() => {
    // Set up notification response handler
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      handleNotificationNavigation(data);
    });

    return () => {
      subscription.remove();
    };
  }, [session, currentGroup]);

  const handleNotificationNavigation = (data: NotificationData) => {
    if (!navigationRef.current || !session || !currentGroup) {
      return;
    }

    // Wait a bit for navigation to be ready
    setTimeout(() => {
      try {
        switch (data.type) {
          case 'prayer':
            navigationRef.current?.navigate('MainTabs', {
              screen: 'Prayers',
            });
            break;
          case 'devotional':
            navigationRef.current?.navigate('MainTabs', {
              screen: 'Devotionals',
            });
            break;
          case 'event':
            navigationRef.current?.navigate('MainTabs', {
              screen: 'Events',
            });
            break;
        }
      } catch (error) {
        console.error('Error navigating from notification:', error);
      }
    }, 500);
  };

  return (
    <NotificationContext.Provider value={{ navigationRef }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

