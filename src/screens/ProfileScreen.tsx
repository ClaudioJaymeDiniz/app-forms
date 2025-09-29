import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  List,
  Avatar,
  Divider
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { syncService } from '../services/syncService';

const ProfileScreen: React.FC = () => {
  const { state, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleSync = async () => {
    try {
      if (!syncService.isConnected()) {
        Alert.alert('Erro', 'Você está offline. Conecte-se à internet para sincronizar.');
        return;
      }
      
      await syncService.forcSync();
      Alert.alert('Sucesso', 'Sincronização concluída com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Falha na sincronização. Tente novamente.');
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'user': return 'Usuário';
      default: return 'Desconhecido';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header do perfil */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text 
            size={80} 
            label={getInitials(state.user?.name || 'U')}
            style={styles.avatar}
          />
          <Title style={styles.userName}>{state.user?.name}</Title>
          <Text style={styles.userEmail}>{state.user?.email}</Text>
          <Text style={styles.userRole}>{getRoleText(state.user?.role || 'user')}</Text>
        </Card.Content>
      </Card>

      {/* Informações da conta */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Informações da Conta</Title>
          <List.Item
            title="Nome"
            description={state.user?.name}
            left={props => <List.Icon {...props} icon="account" />}
          />
          <Divider />
          <List.Item
            title="Email"
            description={state.user?.email}
            left={props => <List.Icon {...props} icon="email" />}
          />
          <Divider />
          <List.Item
            title="Tipo de conta"
            description={getRoleText(state.user?.role || 'user')}
            left={props => <List.Icon {...props} icon="shield-account" />}
          />
          <Divider />
          <List.Item
            title="Membro desde"
            description={state.user?.createdAt ? new Date(state.user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
            left={props => <List.Icon {...props} icon="calendar" />}
          />
        </Card.Content>
      </Card>

      {/* Configurações */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Configurações</Title>
          <List.Item
            title="Sincronizar dados"
            description="Sincronizar dados offline com o servidor"
            left={props => <List.Icon {...props} icon="sync" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleSync}
          />
          <Divider />
          <List.Item
            title="Notificações"
            description="Gerenciar notificações do aplicativo"
            left={props => <List.Icon {...props} icon="bell" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          <Divider />
          <List.Item
            title="Privacidade"
            description="Configurações de privacidade e dados"
            left={props => <List.Icon {...props} icon="shield-lock" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
        </Card.Content>
      </Card>

      {/* Sobre o aplicativo */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Sobre</Title>
          <List.Item
            title="Versão do aplicativo"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <Divider />
          <List.Item
            title="Termos de uso"
            description="Leia nossos termos de uso"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          <Divider />
          <List.Item
            title="Política de privacidade"
            description="Leia nossa política de privacidade"
            left={props => <List.Icon {...props} icon="shield-check" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          <Divider />
          <List.Item
            title="Suporte"
            description="Entre em contato conosco"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Suporte', 'Email: suporte@reportsapp.com')}
          />
        </Card.Content>
      </Card>

      {/* Botão de logout */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            icon="logout"
            buttonColor="#F44336"
          >
            Sair da Conta
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 20,
    elevation: 4,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
  },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ProfileScreen;

