import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  ActivityIndicator,
  List,
  Divider,
  FAB,
  IconButton
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../database/database';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Notification } from '../types';

type NotificationsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { state } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      if (!state.user?.id) return;
      
      const userNotifications = await databaseService.getNotificationsByUserId(state.user.id);
      setNotifications(userNotifications);
      
      const count = userNotifications.filter(notification => !notification.read).length;
      setUnreadCount(count);
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as notificações.');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [state.user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await databaseService.markNotificationAsRead(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      Alert.alert('Erro', 'Não foi possível marcar a notificação como lida.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!state.user?.id) return;
      
      await databaseService.markAllNotificationsAsRead(state.user.id);
      loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      Alert.alert('Erro', 'Não foi possível marcar todas as notificações como lidas.');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await databaseService.deleteNotification(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      Alert.alert('Erro', 'Não foi possível excluir a notificação.');
    }
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'report':
        return 'file-document';
      case 'submission':
        return 'clipboard-text';
      case 'project':
        return 'folder';
      case 'system':
        return 'bell';
      default:
        return 'bell';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Title style={styles.title}>Notificações</Title>
          {notifications.length > 0 && (
            <Button 
              mode="text" 
              onPress={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Marcar todas como lidas
            </Button>
          )}
        </View>

        {notifications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyText}>Você não possui notificações</Text>
            </Card.Content>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              style={[
                styles.notificationCard,
                !notification.read && styles.unreadCard
              ]}
            >
              <Card.Content>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationTitleContainer}>
                    <List.Icon icon={renderNotificationIcon(notification.type)} />
                    <Title style={styles.notificationTitle}>{notification.title}</Title>
                  </View>
                  <Text style={styles.notificationDate}>
                    {formatDate(notification.created_at)}
                  </Text>
                </View>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <View style={styles.notificationActions}>
                  {!notification.read && (
                    <Button 
                      mode="text" 
                      onPress={() => handleMarkAsRead(notification.id)}
                      style={styles.actionButton}
                    >
                      Marcar como lida
                    </Button>
                  )}
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteNotification(notification.id)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCard: {
    margin: 16,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
  },
  notificationCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationDate: {
    fontSize: 12,
    color: '#757575',
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    marginRight: 8,
  },
});

export default NotificationsScreen;