import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Button, Card, Screen, baseFont, colors } from "@borine/ui";
import { isOverlayPermissionGranted, openOverlayPermissionSettings } from "../native/overlayControl";
import { AdBanner } from "../components/AdBanner";

const PRIVACY_POLICY_URL =
  "https://www.notion.so/2d2328a23d0f802ba414fe7f2f7b7dcf?source=copy_link";
const STROKE_WIDTH_KEY = "@malhaejwo_stroke_width";

const STROKE_OPTIONS = [
  { label: "얇게", value: 18 },
  { label: "보통", value: 28 },
  { label: "두껍게", value: 40 },
  { label: "매우 두껍게", value: 55 },
];

export function SettingsScreen() {
  const [overlayGranted, setOverlayGranted] = useState<boolean | null>(null);
  const [strokeWidth, setStrokeWidth] = useState<number>(28);

  const refreshOverlayPermission = async () => {
    try {
      const granted = await isOverlayPermissionGranted();
      setOverlayGranted(granted);
    } catch {
      setOverlayGranted(false);
    }
  };

  useEffect(() => {
    refreshOverlayPermission();
    const loadSettings = async () => {
      const saved = await AsyncStorage.getItem(STROKE_WIDTH_KEY);
      if (saved) {
        setStrokeWidth(parseInt(saved, 10));
      }
    };
    loadSettings();
  }, []);

  const onSelectStrokeWidth = async (width: number) => {
    setStrokeWidth(width);
    await AsyncStorage.setItem(STROKE_WIDTH_KEY, width.toString());
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.title}>권한 설정</Text>
          <Text style={styles.body}>
            오버레이 권한은 다른 앱 위에 토글을 띄우기 위해 필요합니다.{"\n"}
            Android 설정에서 "보리네 말해줘 > 다른 앱 위에 표시"를 허용해 주세요.
          </Text>
          <View style={styles.smallSpacer} />
          <Text style={styles.body}>
            오버레이 권한: {overlayGranted === null ? "확인 중..." : overlayGranted ? "허용됨" : "허용 필요"}
          </Text>
          <View style={styles.smallSpacer} />
          <Button label="설정 바로가기" onPress={openOverlayPermissionSettings} />
        </Card>

        <Card>
          <Text style={styles.title}>형광펜 크기</Text>
          <Text style={styles.body}>화면을 칠할 때 사용할 형광펜의 두께를 선택하세요.</Text>
          <View style={styles.smallSpacer} />
          <View style={styles.optionsRow}>
            {STROKE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionButton,
                  strokeWidth === opt.value && styles.optionButtonActive,
                ]}
                onPress={() => onSelectStrokeWidth(opt.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    strokeWidth === opt.value && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.previewLine,
                { height: strokeWidth, borderRadius: strokeWidth / 2 },
              ]}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.title}>개인정보처리방침</Text>
          <Button label="열어보기" variant="ghost" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
        </Card>
        <AdBanner />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: baseFont, fontSize: 18, color: colors.text, marginBottom: 8 },
  body: { fontFamily: baseFont, fontSize: 14, lineHeight: 20, color: colors.muted },
  smallSpacer: { height: 8 },
  scrollBody: { paddingBottom: 16, gap: 10 },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  optionText: {
    fontFamily: baseFont,
    fontSize: 13,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: "bold",
  },
  previewContainer: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLine: {
    width: "80%",
    backgroundColor: "#FFE169",
    opacity: 0.8,
  },
});
