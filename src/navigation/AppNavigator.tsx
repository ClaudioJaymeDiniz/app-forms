import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../screens/LoadingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ReportsScreen from "../screens/ReportsScreen";
import CreateReportScreen from "../screens/CreateReportScreen";
import ReportDetailScreen from "../screens/ReportDetailScreen";
import ReportResponsesScreen from "../screens/ReportResponsesScreen";
import FillReportScreen from "../screens/FillReportScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import CreateProjectScreen from "../screens/CreateProjectScreen";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  CreateReport: { projectId?: string };
  ReportDetail: { reportId: string };
  ReportResponses: { reportId: string };
  FillReport: { reportId: string; submissionId?: string };
  CreateProject: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Reports: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === "Dashboard") {
          iconName = focused ? "home" : "home-outline";
        } else if (route.name === "Projects") {
          iconName = focused ? "folder" : "folder-outline";
        } else if (route.name === "Reports") {
          iconName = focused ? "document" : "document-outline";
        } else if (route.name === "Profile") {
          iconName = focused ? "person" : "person-outline";
        } else {
          iconName = "help-outline";
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: "#2196F3",
      tabBarInactiveTintColor: "gray",
      headerStyle: {
        backgroundColor: "#2196F3",
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "bold",
      },
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: "Dashboard" }}
    />
    <Tab.Screen
      name="Projects"
      component={ProjectsScreen}
      options={{ title: "Projetos" }}
    />
    <Tab.Screen
      name="Reports"
      component={ReportsScreen}
      options={{ title: "Relatórios" }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: "Perfil" }}
    />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Main"
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CreateProject"
      component={CreateProjectScreen}
      options={{
        title: "Criar Projeto",
        headerStyle: { backgroundColor: "#2196F3" },
        headerTintColor: "#fff",
      }}
    />
    <Stack.Screen
      name="CreateReport"
      component={CreateReportScreen}
      options={{
        title: "Criar Relatório",
        headerStyle: { backgroundColor: "#2196F3" },
        headerTintColor: "#fff",
      }}
    />
    <Stack.Screen
      name="ReportDetail"
      component={ReportDetailScreen}
      options={{
        title: "Detalhes do Relatório",
        headerStyle: { backgroundColor: "#2196F3" },
        headerTintColor: "#fff",
      }}
    />
    <Stack.Screen
      name="ReportResponses"
      component={ReportResponsesScreen}
      options={{
        title: "Respostas do Relatório",
        headerStyle: { backgroundColor: "#2196F3" },
        headerTintColor: "#fff",
      }}
    />
    <Stack.Screen
      name="FillReport"
      component={FillReportScreen}
      options={{
        title: "Preencher Relatório",
        headerStyle: { backgroundColor: "#2196F3" },
        headerTintColor: "#fff",
      }}
    />
  </Stack.Navigator>
);

const AppNavigator: React.FC = () => {
  const { state, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.isAuthenticated ? (
          <Stack.Screen name="Main" component={MainStack} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
