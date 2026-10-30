import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import './src/utils/notifications';
import * as Notifications from 'expo-notifications';
import { CustomAlert } from './src/components/CustomAlert';
import { storage } from './src/store/storage';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { BankNotificationService } from './src/services/bankNotification.service';

const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const handledNotifications = useRef<string[]>([]);

  useEffect(() => {
    const unsub = BankNotificationService.subscribeOpenBankModal(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('MainApp', { screen: 'Home' });
      }
    });
    return () => unsub();
  }, []);



  useEffect(() => {
    if (
      lastNotificationResponse &&
      isReady &&
      navigationRef.isReady()
    ) {
      const notificationId = lastNotificationResponse.notification.request.identifier;
      if (handledNotifications.current.includes(notificationId)) {
        return;
      }
      handledNotifications.current.push(notificationId);

      const type = lastNotificationResponse.notification.request.content.data?.type;
      if (type === 'daily_report' || type === 'monthly_report' || type === 'yearly_report') {
        navigationRef.navigate('MainApp', { screen: 'Statistics', params: { openHistory: true } });
      } else if (type === 'reminder') {
        navigationRef.navigate('MainApp', { screen: 'Home' });
      }
    }
  }, [lastNotificationResponse, isReady]);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => setIsReady(true)}
        >
          <RootNavigator />
        </NavigationContainer>
        <CustomAlert />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

