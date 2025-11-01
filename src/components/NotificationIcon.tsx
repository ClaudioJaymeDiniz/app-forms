import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../database/database';
import { RootStackParamList } from '../navigation/AppNavigator';

type NotificationIconProps = {
  color?: string;
  size?: number;
};

const NotificationIcon: React.FC<NotificationIconProps> = ({ 
  color = '#fff', 
  size = 24 
}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { state } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    if (!state.user?.id) return;
    
    try {
      const count = await databaseService.getUnreadNotificationsCount(state.user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao carregar contagem de notificações:', error);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [state.user?.id]);

  const handlePress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Ionicons name="notifications" size={size} color={color} />
      {unreadCount > 0 && (
        <Badge style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</Badge>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5252',
  },
});

export default NotificationIcon;