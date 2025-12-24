import { useEffect, useMemo } from "react";
import { Platform, Text, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import mobileAds from "react-native-google-mobile-ads";

import { baseFont, colors } from "@borine/ui";

import { HomeScreen } from "./src/screens/HomeScreen";
import { CaptureScreen } from "./src/screens/CaptureScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import type { RootStackParamList } from "./src/navigation/types";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList, undefined>();

export default function App() {
  const [fontsLoaded] = useFonts({
    Cafe24Ssurround: require("./assets/fonts/Cafe24Ssurround-v2.0.ttf")
  });

  useEffect(() => {
    mobileAds().initialize().catch(() => {});
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    (Text as any).defaultProps = (Text as any).defaultProps || {};
    (Text as any).defaultProps.style = [(Text as any).defaultProps.style, { fontFamily: baseFont }];

    (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
    (TextInput as any).defaultProps.style = [(TextInput as any).defaultProps.style, { fontFamily: baseFont }];

    SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  const navTheme = useMemo(
    () => ({
      dark: false,
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.primary
      },
      fonts: Platform.select({
        default: {
          regular: { fontFamily: baseFont, fontWeight: "400" as const },
          medium: { fontFamily: baseFont, fontWeight: "600" as const },
          bold: { fontFamily: baseFont, fontWeight: "700" as const },
          heavy: { fontFamily: baseFont, fontWeight: "800" as const }
        }
      })
    }),
    []
  );

  if (!fontsLoaded) return null;

  return (
    <NavigationContainer
      theme={navTheme as any}
      linking={{
        prefixes: [Linking.createURL("/"), "borinemalhaejwo://"],
        config: {
          screens: {
            Home: "",
            Capture: "capture",
            Settings: "settings"
          }
        }
      }}
    >
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: baseFont }
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "보리네 말해줘" }} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: "읽을 부분 표시" }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "설정" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
