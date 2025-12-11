import 'react-native-get-random-values';

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@borine/ui';
import { MedicationProvider } from './src/context/MedicationProvider';
import { HomeScreen } from './src/screens/HomeScreen';
import { MedicationListScreen } from './src/screens/MedicationListScreen';
import { AddMedicationScreen } from './src/screens/AddMedicationScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <MedicationProvider>
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
            headerTitleStyle: { fontSize: 24, fontWeight: '700' },
            headerShadowVisible: false
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '오늘의 약' }} />
          <Stack.Screen
            name="MedicationList"
            component={MedicationListScreen}
            options={{ title: '약 관리' }}
          />
          <Stack.Screen
            name="AddMedication"
            component={AddMedicationScreen}
            options={{ title: '약 추가하기' }}
          />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: '기록 보기' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </MedicationProvider>
  );
}
