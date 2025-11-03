import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as Facebook from 'expo-auth-session/providers/facebook';
import Constants from 'expo-constants';
import { signInWithCredential, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseService';
import { syncService } from '../services/syncService';
import * as SecureStore from 'expo-secure-store';
import { AuthState, User, LoginCredentials, RegisterData } from '../types';
import { databaseService } from '../database/database';

interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
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

  const isWeb = Platform.OS === 'web';

  WebBrowser.maybeCompleteAuthSession();

  const extra = (Constants?.expoConfig?.extra as any) || {};
  const googleWebClientId = extra?.auth?.googleClientId as string | undefined;
  const googleAndroidClientId = extra?.auth?.androidClientId as string | undefined;
  const googleIosClientId = extra?.auth?.iosClientId as string | undefined;
  const googleExpoClientId = extra?.auth?.expoClientId as string | undefined;
  const facebookAppId = extra?.auth?.facebookAppId as string | undefined;

  const appOwnership = (Constants as any)?.appOwnership;
  const isExpoGo = appOwnership === 'expo';

  const redirectUri = AuthSession.makeRedirectUri();
  const googleClientIdForPlatform = isExpoGo
    ? (googleExpoClientId || googleWebClientId)
    : (Platform.OS === 'android'
        ? googleAndroidClientId
        : Platform.OS === 'ios'
          ? googleIosClientId
          : googleWebClientId);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: googleClientIdForPlatform || 'MISSING_GOOGLE_CLIENT_ID',
    redirectUri,
    responseType: 'id_token',
    scopes: ['openid', 'profile', 'email'],
  });

  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: facebookAppId || 'MISSING_FACEBOOK_APP_ID',
    redirectUri,
  });

  const secureGetItem = async (key: string): Promise<string | null> => {
    if (isWeb) {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return await SecureStore.getItemAsync(key);
  };

  const secureSetItem = async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  };

  const secureDeleteItem = async (key: string): Promise<void> => {
    if (isWeb) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await secureGetItem('auth_token');
      const refreshToken = await secureGetItem('refresh_token');
      const userJson = await secureGetItem('user_data');

      if (token && userJson) {
        const user = JSON.parse(userJson);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token, refreshToken: refreshToken || '' },
        });
        // Inicia uma semeadura para garantir que o Firebase não fique em branco
        try {
          await syncService.seedAllToFirebase();
        } catch (e) {
          console.warn('Seed to Firebase failed:', e);
        }
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
        const now = new Date().toISOString();
        const userData: Omit<User, 'id'> = {
          email: credentials.email,
          name: credentials.email.split('@')[0],
          role: 'admin' as 'admin', // Por padrão, primeiro usuário é admin
          createdAt: now,
          updatedAt: now,
        };
        const userId = await databaseService.createUser(userData);
        // Popula Firebase
        await syncService.addToSyncQueue('user', 'create', userId, { id: userId, ...userData });
        
        user = await databaseService.getUserById(userId);
      }

      if (!user) {
        throw new Error('Falha ao criar/encontrar usuário');
      }

      // Simula autenticação (em produção, validaria senha)
      const token = `token_${Date.now()}`;
      const refreshToken = `refresh_${Date.now()}`;

      // Salva dados de autenticação
      await secureSetItem('auth_token', token);
      await secureSetItem('refresh_token', refreshToken);
      await secureSetItem('user_data', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token, refreshToken },
      });

      // Semeia dados locais para o Firebase após login
      try {
        await syncService.seedAllToFirebase();
      } catch (e) {
        console.warn('Seed to Firebase failed after login:', e);
      }
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
      const now = new Date().toISOString();
      const userData: Omit<User, 'id'> = {
        email: data.email,
        name: data.name,
        role: 'user' as 'user',
        createdAt: now,
        updatedAt: now,
      };
      const userId = await databaseService.createUser(userData);
      // Popula Firebase
      await syncService.addToSyncQueue('user', 'create', userId, { id: userId, ...userData });

      const user = await databaseService.getUserById(userId);
      if (!user) {
        throw new Error('Falha ao criar usuário');
      }

      // Faz login automático após registro
      const token = `token_${Date.now()}`;
      const refreshToken = `refresh_${Date.now()}`;

      await secureSetItem('auth_token', token);
      await secureSetItem('refresh_token', refreshToken);
      await secureSetItem('user_data', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token, refreshToken },
      });

      // Semeia dados locais para o Firebase após registro
      try {
        await syncService.seedAllToFirebase();
      } catch (e) {
        console.warn('Seed to Firebase failed after register:', e);
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await secureDeleteItem('auth_token');
      await secureDeleteItem('refresh_token');
      await secureDeleteItem('user_data');
      
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const result = await (googlePromptAsync as any)();
      const idToken = result?.type === 'success' ? result.authentication?.idToken : undefined;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCred = await signInWithCredential(auth, credential);
        const user: User = {
          id: userCred.user.uid,
          email: userCred.user.email || 'google_user@example.com',
          name: userCred.user.displayName || 'Google User',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await secureSetItem('auth_token', (await userCred.user.getIdToken()) || '');
        await secureSetItem('refresh_token', '');
        await secureSetItem('user_data', JSON.stringify(user));

        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: 'firebase', refreshToken: '' } });
      } else {
        throw new Error('Google auth canceled or failed');
      }
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    try {
      setIsLoading(true);
      const result = await fbPromptAsync();
      const accessToken = result?.type === 'success' ? result.authentication?.accessToken : undefined;
      if (accessToken) {
        const credential = FacebookAuthProvider.credential(accessToken);
        const userCred = await signInWithCredential(auth, credential);
        const user: User = {
          id: userCred.user.uid,
          email: userCred.user.email || 'facebook_user@example.com',
          name: userCred.user.displayName || 'Facebook User',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await secureSetItem('auth_token', (await userCred.user.getIdToken()) || '');
        await secureSetItem('refresh_token', '');
        await secureSetItem('user_data', JSON.stringify(user));

        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: 'firebase', refreshToken: '' } });
      } else {
        throw new Error('Facebook auth canceled or failed');
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithFacebook,
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

