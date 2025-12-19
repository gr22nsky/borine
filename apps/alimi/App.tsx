import 'react-native-get-random-values';

import { useEffect } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Text, TextInput } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';

import { baseFont, colors } from '@borine/ui';
import { useNotificationSync } from './src/hooks/useNotificationSync';
import { RootStackParamList } from './src/navigation/types';
import { AddTaskScreen } from './src/screens/AddTaskScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { TaskProvider, useTaskContext } from './src/context/TaskProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const Stack = createNativeStackNavigator<RootStackParamList>();

const NotificationSync = () => {
  const { tasks, history } = useTaskContext();
  useNotificationSync(tasks, history);
  return null;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Cafe24Ssurround: require('./assets/fonts/Cafe24Ssurround-v2.0.ttf')
  });

  useEffect(() => {
    mobileAds().initialize().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    (Text as any).defaultProps = (Text as any).defaultProps || {};
    (Text as any).defaultProps.style = [(Text as any).defaultProps.style, { fontFamily: baseFont }];
    (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
    (TextInput as any).defaultProps.style = [
      (TextInput as any).defaultProps.style,
      { fontFamily: baseFont }
    ];
    SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <TaskProvider>
      <NotificationSync />
      <NavigationContainer
        theme={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, background: colors.background }
        }}
      >
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerTitleStyle: { fontSize: 24, fontWeight: '700', fontFamily: baseFont },
            headerShadowVisible: false
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '오늘 할일' }} />
          <Stack.Screen name="TaskList" component={TaskListScreen} options={{ title: '할일 관리' }} />
          <Stack.Screen name="AddTask" component={AddTaskScreen} options={{ title: '할 일 추가하기' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: '캘린더' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </TaskProvider>
  );
}

