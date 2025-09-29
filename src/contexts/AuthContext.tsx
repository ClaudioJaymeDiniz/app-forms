import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthState, User, LoginCredentials, RegisterData } from '../types';
import { databaseService } from '../database/database';

interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
      };
    case 'LOGOUT':
      return initialState;
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const userJson = await SecureStore.getItemAsync('user_data');

      if (token && userJson) {
        const user = JSON.parse(userJson);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token, refreshToken: refreshToken || '' },
        });
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      // Primeiro verifica se o usuário existe no banco local
      let user = await databaseService.getUserByEmail(credentials.email);
      
      if (!user) {
        // Se não existe, cria um usuário de demonstração
        const userId = await databaseService.createUser({
          email: credentials.email,
          name: credentials.email.split('@')[0],
          role: 'admin', // Por padrão, primeiro usuário é admin
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        user = await databaseService.getUserById(userId);
      }

      if (!user) {
        throw new Error('Falha ao criar/encontrar usuário');
      }

      // Simula autenticação (em produção, validaria senha)
      const token = `token_${Date.now()}`;
      const refreshToken = `refresh_${Date.now()}`;

      // Salva dados de autenticação
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token, refreshToken },
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      // Verifica se o usuário já existe
      const existingUser = await databaseService.getUserByEmail(data.email);
      if (existingUser) {
        throw new Error('Usuário já existe com este email');
      }

      // Cria novo usuário
      const userId = await databaseService.createUser({
        email: data.email,
        name: data.name,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const user = await databaseService.getUserById(userId);
      if (!user) {
        throw new Error('Falha ao criar usuário');
      }

      // Faz login automático após registro
      const token = `token_${Date.now()}`;
      const refreshToken = `refresh_${Date.now()}`;

      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token, refreshToken },
      });
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user_data');
      
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loginWithGoogle = async () => {
    // TODO: Implementar autenticação com Google
    // Por enquanto, simula login com Google
    await login({ email: 'google@example.com', password: 'google' });
  };

  const loginWithMicrosoft = async () => {
    // TODO: Implementar autenticação com Microsoft
    // Por enquanto, simula login com Microsoft
    await login({ email: 'microsoft@example.com', password: 'microsoft' });
  };

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithMicrosoft,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

