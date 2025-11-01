import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { databaseService } from '../database/database';
import { Notification } from '../types';

// Configuração das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Campos exigidos pelo tipo NotificationBehavior nas versões recentes
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  // Solicitar permissões para notificações
  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permissão para notificações não concedida!');
      return false;
    }
    
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
      });
    }
    
    return true;
  }

  // Agendar uma notificação local
  async scheduleLocalNotification(title: string, body: string, data: any = {}) {
    const hasPermission = await this.requestPermissions();
    
    if (!hasPermission) {
      console.log('Sem permissão para enviar notificações');
      return null;
    }
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Notificação imediata
    });
    
    return notificationId;
  }

  // Criar uma notificação no banco de dados e exibir como notificação local
  async createAndShowNotification(userId: string, type: string, title: string, message: string, data: any = {}) {
    try {
      // Criar notificação no banco de dados
      await databaseService.createNotification({
        user_id: userId,
        type,
        title,
        message,
        data: JSON.stringify(data),
        read: false,
        created_at: new Date().toISOString(),
      });
      
      // Exibir como notificação local
      await this.scheduleLocalNotification(title, message, data);
      
      return true;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return false;
    }
  }

  // Obter contagem de notificações não lidas
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await databaseService.getUnreadNotificationsCount(userId);
    } catch (error) {
      console.error('Erro ao obter contagem de notificações não lidas:', error);
      return 0;
    }
  }

  // Configurar listeners para notificações
  setupNotificationListeners(onNotificationReceived: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
    return subscription;
  }
}

export const notificationService = new NotificationService();