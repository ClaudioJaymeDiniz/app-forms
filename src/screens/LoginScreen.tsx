import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../contexts/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, loginWithGoogle, loginWithMicrosoft, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erro", "Por favor, preencha todos os campos");
      return;
    }

    setLoginLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (error) {
      Alert.alert("Erro", "Falha no login. Verifique suas credenciais.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      Alert.alert("Erro", "Falha no login com Google");
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      await loginWithMicrosoft();
    } catch (error) {
      Alert.alert("Erro", "Falha no login com Microsoft");
    }
  };

  const navigateToRegister = () => {
    navigation.navigate("Register");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Ionicons name="document" size={80} color="#2196F3" />
        <Text style={styles.title}>Reports App</Text>
        <Text style={styles.subtitle}>
          Gerencie seus relatórios de forma simples e eficiente
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Entrar</Title>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            loading={loginLoading}
            disabled={loginLoading}
          >
            Entrar
          </Button>

          <Divider style={styles.divider} />

          <Text style={styles.orText}>ou entre com</Text>

          <View style={styles.socialButtons}>
            <Button
              mode="outlined"
              onPress={handleGoogleLogin}
              style={[styles.socialButton, styles.googleButton]}
              icon="google"
              disabled={loginLoading}
            >
              Google
            </Button>

            <Button
              mode="outlined"
              onPress={handleMicrosoftLogin}
              style={[styles.socialButton, styles.microsoftButton]}
              icon="microsoft"
              disabled={loginLoading}
            >
              Microsoft
            </Button>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Não tem uma conta? </Text>
            <Button
              mode="text"
              onPress={navigateToRegister}
              compact
              disabled={loginLoading}
            >
              Cadastre-se
            </Button>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Versão 1.0.0 - Reports App</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2196F3",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  cardTitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 20,
  },
  orText: {
    textAlign: "center",
    color: "#666",
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  googleButton: {
    borderColor: "#db4437",
  },
  microsoftButton: {
    borderColor: "#0078d4",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  registerText: {
    color: "#666",
  },
  footer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    color: "#999",
    fontSize: 12,
  },
});

export default LoginScreen;
