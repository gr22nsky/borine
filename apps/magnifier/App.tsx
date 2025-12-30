import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity as RNTouchableOpacity, Modal, Alert, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { 
  Zap, 
  ZapOff, 
  Play, 
  Pause, 
  Plus, 
  Minus,
  RotateCcw,
  Focus,
  Settings,
  X,
  Tv,
  Maximize,
  Search,
  ChevronLeft
} from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import mobileAds, { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  RewardedAd, 
  RewardedAdEventType,
  AdEventType
} from 'react-native-google-mobile-ads';

import { colors, baseFont, Button, Card, Screen } from './src/ui';
import { RootStackParamList } from './src/navigation/types';

const { width, height } = Dimensions.get('window');
const Stack = createNativeStackNavigator<RootStackParamList>();

const STORAGE_KEY = "@magnifier_unlocked_until";
const SETTINGS_KEY = "@magnifier_settings";
const PRIVACY_POLICY_URL = "https://www.notion.so/2d8328a23d0f80c9b538cac7c09ce11f?source=copy_link";

const AD_IDS = {
  BANNER: __DEV__ ? TestIds.BANNER : "ca-app-pub-5720633830102347/2963518688",
  REWARDED: __DEV__ ? TestIds.REWARDED : "ca-app-pub-5720633830102347/6220059803",
};

// --- AdBanner Component ---
function AdBanner() {
  return (
    <View style={styles.adContainer}>
      <BannerAd
        unitId={AD_IDS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

// --- Settings Defaults ---
const DEFAULT_SETTINGS = {
  power: 5,
  lensSize: 0.85, // 0.5 ~ 1.0
  zoomLevel: 0.3, // 0.0 ~ 1.0
};

// --- HomeScreen ---
type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({ navigation }: HomeProps) {
  const [unlockedUntil, setUnlockedUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [adLoaded, setAdLoaded] = useState(false);

  const isUnlocked = useMemo(() => unlockedUntil > now, [unlockedUntil, now]);

  const rewardedAd = useMemo(() => {
    return RewardedAd.createForAdRequest(AD_IDS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });
  }, []);

  const loadAd = useCallback(() => {
    rewardedAd.load();
  }, [rewardedAd]);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUnlockedUntil(parseInt(stored, 10));
      }
    };
    init();

    const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setAdLoaded(true);
    });
    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        const newExpiry = Date.now() + 24 * 60 * 60 * 1000;
        setUnlockedUntil(newExpiry);
        await AsyncStorage.setItem(STORAGE_KEY, newExpiry.toString());
        Alert.alert("보상 완료", "24시간 동안 무제한 사용이 가능합니다!");
      }
    );
    const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      loadAd();
    });

    loadAd();

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      clearInterval(timer);
    };
  }, [rewardedAd, loadAd]);

  const handleStart = async () => {
    if (isUnlocked) {
      navigation.navigate('Magnifier');
    } else {
      if (adLoaded) {
        rewardedAd.show();
      } else {
        Alert.alert("광고 준비 중", "광고를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        loadAd();
      }
    }
  };

  const formatRemainingTime = () => {
    const diff = unlockedUntil - now;
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}시간 ${minutes}분 ${seconds}초 남음`;
  };

  return (
    <Screen
      footer={
        <View style={{ gap: 10 }}>
          <Button
            label={isUnlocked ? "돋보기" : "광고보고 돋보기"}
            onPress={handleStart}
          />
          <Button 
            label="설정" 
            variant="ghost" 
            onPress={() => navigation.navigate('Settings')} 
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 20, gap: 15 }}>
        <Card>
          <Text style={styles.homeTitle}>보리네 돋보기</Text>
          <Text style={styles.homeBody}>
            보리네 돋보기는 작은 글씨를 크게 보여주는 어르신 맞춤형 앱입니다.
            {"\n\n"}
            <Text style={styles.highlight}>
              📺 광고를 시청하면 24시간 동안 무제한으로 기능을 사용할 수 있습니다!
            </Text>
            {"\n\n"}
            {isUnlocked ? (
              <Text style={styles.timerText}>✅ 무제한 사용 중: {formatRemainingTime()}</Text>
            ) : (
              <Text style={styles.timerText}>❌ 현재 비활성 상태 (광고 시청 필요)</Text>
            )}
            {"\n\n"}
            - 설정에서 돋보기의 크기와 배율을 조절할 수 있습니다.
            {"\n\n"}
            - 화면 멈추기 버튼으로 정지된 화면을 자세히 볼 수 있습니다.
          </Text>
        </Card>
        <AdBanner />
      </ScrollView>
    </Screen>
  );
}

// --- SettingsScreen ---
type SettingsProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function SettingsScreen({ navigation }: SettingsProps) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (newSettings: typeof settings) => {
    setSettings(newSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Card>
          <Text style={styles.modalTitle}>돋보기 크기</Text>
          <Text style={styles.homeBody}>화면 중앙에 보이는 돋보기 원의 크기를 조절합니다.</Text>
          <View style={styles.smallSpacer} />
          <View style={styles.settingRow}>
            <TouchableOpacity 
              onPress={() => saveSettings({ ...settings, lensSize: Math.max(0.4, settings.lensSize - 0.05) })} 
              style={styles.settingButton}
            >
              <Minus size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.settingValue}>{Math.round(settings.lensSize * 100)}%</Text>
            <TouchableOpacity 
              onPress={() => saveSettings({ ...settings, lensSize: Math.min(1.0, settings.lensSize + 0.05) })} 
              style={styles.settingButton}
            >
              <Plus size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </Card>

        <Card>
          <Text style={styles.modalTitle}>확대 배율</Text>
          <Text style={styles.homeBody}>돋보기 안에 보여질 기본 확대 정도를 설정합니다.</Text>
          <View style={styles.smallSpacer} />
          <View style={styles.settingRow}>
            <TouchableOpacity 
              onPress={() => saveSettings({ ...settings, zoomLevel: Math.max(0, settings.zoomLevel - 0.1) })} 
              style={styles.settingButton}
            >
              <Minus size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.settingValue}>{Math.round(settings.zoomLevel * 9 + 1)}배</Text>
            <TouchableOpacity 
              onPress={() => saveSettings({ ...settings, zoomLevel: Math.min(1.0, settings.zoomLevel + 0.1) })} 
              style={styles.settingButton}
            >
              <Plus size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </Card>

        <Card>
          <Text style={styles.modalTitle}>기타</Text>
          <Button 
            label="개인정보 처리방침" 
            variant="ghost" 
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} 
          />
        </Card>

        <AdBanner />
      </ScrollView>
    </Screen>
  );
}

// --- MagnifierScreen ---
type MagnifierProps = NativeStackScreenProps<RootStackParamList, 'Magnifier'>;

function MagnifierScreen({ navigation }: MagnifierProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const cameraRef = useRef<CameraView>(null);
  
  // 돋보기 위치 상태
  const lensX = useSharedValue(width / 2);
  const lensY = useSharedValue(height / 2);
  const flashOpacity = useSharedValue(0);

  // 배율 계산
  const S = useMemo(() => Math.round(settings.zoomLevel * 9 + 1), [settings.zoomLevel]);
  const lensSize = width * settings.lensSize;

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        setIsFrozen(false);
        setCapturedImage(null);
        setIsCapturing(false);
        
        try {
          await cameraRef.current?.resumePreview();
        } catch (e) {}

        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      };
      loadSettings();
    }, [])
  );

  const toggleFreeze = async () => {
    if (isFrozen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await cameraRef.current?.resumePreview();
      } catch (e) {}
      setCapturedImage(null);
      setIsFrozen(false);
      setIsCapturing(false);
      return;
    }

    if (!isCameraReady || isCapturing) return;

    try {
      setIsCapturing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 1. 사진 촬영
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.9, // 품질 상향
        skipProcessing: false,
      });
      
      if (photo && photo.uri) {
        // 안드로이드에서 경로가 가끔 이상하게 잡히는 경우 대응
        let imageUri = photo.uri;
        if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
          imageUri = 'file://' + imageUri;
        }
        
        setCapturedImage(imageUri);
        setIsFrozen(true);
        setIsCapturing(false);
        
        // 2. 촬영 후 아주 잠시 대기하여 이미지가 로드될 시간을 줌
        setTimeout(async () => {
          try {
            await cameraRef.current?.pausePreview();
          } catch (e) {}
        }, 150);

        // 찰칵 하는 플래시 효과
        flashOpacity.value = withTiming(1, { duration: 50 }, () => {
          flashOpacity.value = withTiming(0, { duration: 200 });
        });
      } else {
        setIsCapturing(false);
      }
    } catch (e) {
      console.error("Freeze toggle error:", e);
      setIsCapturing(false);
      Alert.alert("알림", "화면을 멈추는 데 실패했습니다.");
    }
  };

  const updateZoomLevel = async (nextZoom: number) => {
    const newSettings = { ...settings, zoomLevel: nextZoom };
    setSettings(newSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  // 돋보기 드래그 제스처
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      lensX.value = e.absoluteX;
      lensY.value = e.absoluteY;
    });

  // 돋보기 터치(정지) 제스처
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(toggleFreeze)();
    });

  // 핀치 줌 제스처 (배율 조절)
  const startZoom = useRef(0);
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startZoom.current = settings.zoomLevel;
    })
    .onUpdate((e) => {
      const sensitivity = 0.5;
      const delta = (e.scale - 1) * sensitivity;
      const nextZoom = Math.max(0, Math.min(1, startZoom.current + delta));
      runOnJS(updateZoomLevel)(nextZoom);
    });

  const combinedGesture = Gesture.Simultaneous(panGesture, tapGesture, pinchGesture);

  // 돋보기 원 이동 스타일
  const lensAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lensX.value - lensSize / 2 },
      { translateY: lensY.value - lensSize / 2 },
    ],
  }));

  // 렌즈 내부 카메라 확대 및 위치 보정 스타일 (디지털 줌 전용)
  const innerCameraStyle = useAnimatedStyle(() => {
    const scale = S;
    const cx = lensX.value;
    const cy = lensY.value;

    return {
      width: width,
      height: height,
      position: 'absolute',
      // 렌즈 중앙에 배경의 해당 지점이 오도록 정밀 계산
      transform: [
        { translateX: lensSize / 2 - width / 2 },
        { translateY: lensSize / 2 - height / 2 },
        { scale: scale },
        { translateX: width / 2 - cx },
        { translateY: height / 2 - cy },
      ],
    };
  });

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.iconCircle}>
          <Focus size={80} color={colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>돋보기를 사용해볼까요?</Text>
        <Text style={styles.permissionText}>
          글씨를 크게 보기 위해{"\n"}카메라 권한이 필요합니다.
        </Text>
        <RNTouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>권한 허용하기</Text>
        </RNTouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.cameraContainer}>
        {/* Layer 1: 배경 카메라 (정지 시 pausePreview로 배경 유지) */}
        <CameraView 
          style={StyleSheet.absoluteFill} 
          zoom={0}
          enableTorch={flash}
          ref={cameraRef}
          facing="back"
          onCameraReady={() => setIsCameraReady(true)}
        />

        {/* Layer 2: 돋보기 렌즈 (가장 위) */}
        <GestureDetector gesture={combinedGesture}>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {isFrozen && capturedImage ? (
              <Animated.View style={[styles.magOuter, lensAnimatedStyle, { zIndex: 999, elevation: 999 }]}>
                <View 
                  collapsable={false}
                  style={[
                    styles.magClip, 
                    { 
                      width: lensSize, 
                      height: lensSize, 
                      borderRadius: lensSize / 2,
                      borderColor: '#FFD700',
                      backgroundColor: '#111',
                      overflow: 'hidden',
                    }
                  ]}
                >
                  <Animated.View style={innerCameraStyle}>
                    <Image 
                      key={capturedImage}
                      source={{ uri: capturedImage }} 
                      style={{ 
                        width: width, 
                        height: height,
                      }} 
                      contentFit="cover"
                      transition={0}
                    />
                  </Animated.View>
                </View>
              </Animated.View>
            ) : (
              <Animated.View style={[styles.magOuter, lensAnimatedStyle]}>
                <View 
                  style={[
                    styles.magClip, 
                    { 
                      width: lensSize, 
                      height: lensSize, 
                      borderRadius: lensSize / 2,
                      borderColor: isCapturing ? '#FFD700' : 'rgba(255,255,255,0.8)',
                      borderStyle: isCapturing ? 'solid' : 'dashed',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isCapturing ? 'rgba(0,0,0,0.3)' : 'transparent',
                    }
                  ]}
                >
                  {isCapturing ? (
                    <View style={styles.loadingBadge}>
                      <Text style={styles.guideText}>사진 찍는 중...</Text>
                    </View>
                  ) : (
                    <Text style={styles.guideText}>화면을 눌러{"\n"}확대하기</Text>
                  )}
                </View>
              </Animated.View>
            )}
          </View>
        </GestureDetector>
        
        <Animated.View style={[styles.flashOverlay, flashStyle]} pointerEvents="none" />

        <View style={styles.uiLayer} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="box-none">
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.roundButton}
            >
              <ChevronLeft size={40} color="#FFF" />
              <Text style={styles.buttonLabel}>뒤로</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setFlash(!flash)} 
              style={[styles.roundButton, flash && styles.activeButton]}
            >
              {flash ? <Zap size={32} color="#FFF" /> : <ZapOff size={32} color="#FFF" />}
              <Text style={styles.buttonLabel}>조명</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Settings')} 
              style={styles.roundButton}
            >
              <Settings size={32} color="#FFF" />
              <Text style={styles.buttonLabel}>설정</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomArea} pointerEvents="box-none">
          </View>
        </View>
      </View>
    </View>
  );
}

// --- Main App ---
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Cafe24Ssurround: require("./assets/fonts/Cafe24Ssurround-v2.0.ttf")
  });
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 리소스 준비
      } catch (e) {
        console.warn(e);
      } finally {
        if (fontsLoaded) {
          setAppIsReady(true);
        }
      }
    }
    prepare();
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: true,
            headerTitleStyle: { fontFamily: baseFont },
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background }
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: "보리네 돋보기" }} />
          <Stack.Screen name="Magnifier" component={MagnifierScreen} options={{ title: "돋보기", headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "설정" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  uiLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeButton: {
    backgroundColor: colors.primary,
    borderColor: '#FFF',
  },
  buttonLabel: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
    fontFamily: baseFont,
  },
  bottomArea: {
    gap: 20,
  },
  zoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 50,
    padding: 10,
    gap: 10,
  },
  zoomSideButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomTrack: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomFill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    backgroundColor: colors.primary,
  },
  zoomValueText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontFamily: baseFont,
  },
  mainActionButton: {
    flexDirection: 'row',
    height: 90,
    backgroundColor: colors.primary,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  resumeButton: {
    backgroundColor: '#2E7D32',
  },
  mainActionText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: baseFont,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  // 돋보기 렌즈 효과 (원형)
  magOuter: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  magClip: {
    overflow: 'hidden',
    borderWidth: 4,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  guideText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: baseFont,
    opacity: 0.8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: baseFont,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 10,
  },
  settingButton: {
    width: 50,
    height: 50,
    backgroundColor: '#DDD',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: baseFont,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5,
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    fontFamily: baseFont,
  },
  permissionText: {
    fontSize: 18,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    fontFamily: baseFont,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 40,
    elevation: 3,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: baseFont,
  },
  homeTitle: { fontFamily: baseFont, fontSize: 24, color: colors.text, marginBottom: 10, fontWeight: 'bold' },
  homeBody: { fontFamily: baseFont, fontSize: 18, lineHeight: 28, color: colors.muted },
  highlight: { color: colors.primary, fontWeight: "bold" },
  timerText: { color: colors.text, fontWeight: "600", fontSize: 16 },
  smallSpacer: { height: 15 },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  logo: {
    width: 300,
    height: 200,
  },
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    minHeight: 60,
  },
});


