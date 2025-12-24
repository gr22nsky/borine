import { useEffect, useState, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, PermissionsAndroid, Platform, AppState } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";

import { Button, Card, Screen, baseFont, colors } from "@borine/ui";
import type { RootStackParamList } from "../navigation/types";
import {
  goHomeScreen,
  isOverlayPermissionGranted,
  isServiceRunning,
  moveTaskToBack,
  setUnlockedUntil as setNativeUnlockedUntil,
  startOverlay,
  stopOverlay,
} from "../native/overlayControl";
import { AdBanner } from "../components/AdBanner";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const REWARDED_AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : "ca-app-pub-5720633830102347/4552804660";
const STORAGE_KEY = "@malhaejwo_unlocked_until";

export function HomeScreen({ navigation }: Props) {
  const [overlayGranted, setOverlayGranted] = useState<boolean | null>(null);
  const [overlayOn, setOverlayOn] = useState(false);
  const [unlockedUntil, setUnlockedUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [adLoaded, setAdLoaded] = useState(false);

  const isUnlocked = useMemo(() => unlockedUntil > now, [unlockedUntil, now]);

  const rewardedAd = useMemo(() => {
    const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    return ad;
  }, []);

  const loadAd = () => {
    rewardedAd.load();
  };

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const val = parseInt(stored, 10);
        setUnlockedUntil(val);
        setNativeUnlockedUntil(val);
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
        setNativeUnlockedUntil(newExpiry);
        await AsyncStorage.setItem(STORAGE_KEY, newExpiry.toString());
        Alert.alert("보상 완료", "24시간 동안 무제한 사용이 가능합니다!");
      }
    );
    const unsubscribeClosed = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setAdLoaded(false);
        loadAd();
      }
    );
    const unsubscribeError = rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.error("Ad Error:", error);
        setAdLoaded(false);
      }
    );

    loadAd();

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      clearInterval(timer);
    };
  }, [rewardedAd]);

  const refreshOverlayPermission = async () => {
    try {
      if (Platform.OS === "android" && (Platform.Version as number) >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      const granted = await isOverlayPermissionGranted();
      setOverlayGranted(granted);

      const running = await isServiceRunning();
      setOverlayOn(running);
    } catch {
      setOverlayGranted(false);
    }
  };

  useEffect(() => {
    refreshOverlayPermission();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        refreshOverlayPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 시간이 만료되면 실행 중인 오버레이를 자동으로 중지
  useEffect(() => {
    if (!isUnlocked && overlayOn) {
      stopOverlay();
      setOverlayOn(false);
      Alert.alert("이용 시간 만료", "무제한 이용 시간이 만료되었습니다. 다시 이용하시려면 광고를 시청해 주세요.");
    }
  }, [isUnlocked, overlayOn]);

  const toggleOverlay = async () => {
    if (!isUnlocked && !overlayOn) {
      if (adLoaded) {
        rewardedAd.show();
      } else {
        Alert.alert("광고 준비 중", "광고를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        loadAd();
      }
      return;
    }

    const granted = await isOverlayPermissionGranted();
    setOverlayGranted(granted);
    if (!granted) {
      Alert.alert("오버레이 권한 필요", "설정에서 오버레이 권한을 허용해 주세요.");
      return;
    }

    if (overlayOn) {
      stopOverlay();
      setOverlayOn(false);
    } else {
      await startOverlay();
      setOverlayOn(true);
      // 오버레이를 켜면 자동으로 앱을 백그라운드로 보냄 (스크린샷 방해 방지)
      setTimeout(() => {
        moveTaskToBack();
      }, 200);
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
        <View style={styles.footerStack}>
          <Button
            label={overlayOn ? "끄기" : isUnlocked ? "말해줘" : "광고보고 말해줘"}
            onPress={toggleOverlay}
          />
          <Button label="설정" variant="ghost" onPress={() => navigation.navigate("Settings")} />
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.title}>보리네 말해줘</Text>
          <Text style={styles.body}>
            보리네 말해줘는 화면에서 필요한 부분만 골라서 읽어주는 앱입니다.
            토글을 켜두면 다른 앱 위에 작은 아이콘이 떠서 언제든 사용할 수 있습니다.
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
            - 다른 앱에서 토글을 누르면 바로 캡처 화면으로 이동합니다.
            {"\n\n"}
            - 읽을 부분을 형광펜으로 표시한 뒤 읽기를 누릅니다.
          </Text>
        </Card>
        <AdBanner />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footerStack: { gap: 10 },
  title: { fontFamily: baseFont, fontSize: 22, color: colors.text, marginBottom: 8 },
  body: { fontFamily: baseFont, fontSize: 16, lineHeight: 24, color: colors.muted },
  highlight: { color: colors.primary, fontWeight: "bold" },
  timerText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  scrollBody: { paddingBottom: 16, gap: 10 }
});
