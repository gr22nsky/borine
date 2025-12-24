import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as Speech from "expo-speech";
import TextRecognition, { TextRecognitionScript } from "@react-native-ml-kit/text-recognition";
import { captureRef } from "react-native-view-shot";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { Button, Screen, colors } from "@borine/ui";
import { DrawingCanvas, getStrokesBounds, type Stroke } from "../components/DrawingCanvas";
import { moveTaskToBack } from "../native/overlayControl";
import type { RootStackParamList } from "../navigation/types";

const SURFACE_HEIGHT = 520;
const STROKE_WIDTH_KEY = "@malhaejwo_stroke_width";

type CaptureRoute = RouteProp<RootStackParamList, "Capture">;

export function CaptureScreen() {
  const route = useRoute<CaptureRoute>();
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [baseImageUri, setBaseImageUri] = useState<string | null>(null);
  const [surfaceLayout, setSurfaceLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [strokeWidth, setStrokeWidth] = useState<number>(28);
  const surfaceRef = useRef<View>(null);

  const hasMarks = strokes.length > 0;
  const canRead = useMemo(() => Boolean(recognizedText?.trim()), [recognizedText]);

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await AsyncStorage.getItem(STROKE_WIDTH_KEY);
      if (saved) {
        setStrokeWidth(parseInt(saved, 10));
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const imageUri = route.params?.imageUri;
    if (!imageUri) return;
    setBaseImageUri(imageUri);
    setStrokes([]);
    setRecognizedText(null);
  }, [route.params?.imageUri]);

  useEffect(() => {
    setRecognizedText(null);
  }, [strokes]);

  const onRecognize = async () => {
    if (!hasMarks) {
      Alert.alert("표시가 필요해요", "읽을 부분을 형광펜으로 먼저 표시해 주세요.");
      return null;
    }
    if (!surfaceRef.current || surfaceLayout.width <= 0 || surfaceLayout.height <= 0) {
      Alert.alert("오류", "캡처 화면 크기를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return null;
    }

    const bounds = getStrokesBounds(strokes);
    if (!bounds) {
      Alert.alert("오류", "표시 영역을 계산할 수 없습니다.");
      return null;
    }

    const padding = 14;
    const originX = Math.max(0, Math.floor(bounds.minX - padding));
    const originY = Math.max(0, Math.floor(bounds.minY - padding));
    const maxX = Math.min(surfaceLayout.width, Math.ceil(bounds.maxX + padding));
    const maxY = Math.min(surfaceLayout.height, Math.ceil(bounds.maxY + padding));
    const width = Math.max(1, maxX - originX);
    const height = Math.max(1, maxY - originY);

    setIsRecognizing(true);
    setRecognizedText(null);
    try {
      const screenshotUri = await captureRef(surfaceRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: surfaceLayout.width,
        height: surfaceLayout.height
      });

      const cropped = await ImageManipulator.manipulateAsync(
        screenshotUri,
        [
          { crop: { originX, originY, width, height } },
          ...(width < 900 ? [{ resize: { width: Math.min(1600, Math.max(900, width * 2)) } }] : [])
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      const result = await TextRecognition.recognize(cropped.uri, TextRecognitionScript.KOREAN);
      const text = result.text?.trim() ?? "";
      setRecognizedText(text.length ? text : "(인식된 텍스트가 없습니다)");
      return text.length ? text : null;
    } catch (error: any) {
      Alert.alert("인식 실패", error?.message ?? "알 수 없는 오류가 발생했습니다.");
      return null;
    } finally {
      setIsRecognizing(false);
    }
  };

  const onRead = async () => {
    if (isRecognizing) return;
    let text = recognizedText;
    if (!text) {
      text = (await onRecognize()) ?? null;
    }
    if (!text) return;
    Speech.stop();
    Speech.speak(text, { language: "ko-KR" });
  };

  const onReset = () => {
    setStrokes([]);
    setRecognizedText(null);
  };

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <Button label="다시 선택" onPress={onReset} variant="ghost" style={styles.footerItem} />
          <Button label={isRecognizing ? "읽는 중…" : "읽기"} onPress={onRead} disabled={!canRead && !hasMarks} style={styles.footerItem} />
          <Button label="돌아가기" onPress={moveTaskToBack} variant="ghost" style={styles.footerItem} />
        </View>
      }
    >
      <View
        style={styles.surfaceWrap}
        onLayout={(e) =>
          setSurfaceLayout({
            width: Math.round(e.nativeEvent.layout.width),
            height: Math.round(e.nativeEvent.layout.height)
          })
        }
      >
        <View ref={surfaceRef} style={styles.surface}>
          {baseImageUri ? (
            <Image source={{ uri: baseImageUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          ) : null}
        </View>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <DrawingCanvas
            overlay
            height={surfaceLayout.height > 0 ? surfaceLayout.height : SURFACE_HEIGHT}
            strokes={strokes}
            onChangeStrokes={setStrokes}
            strokeWidth={strokeWidth}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: "row", gap: 10 },
  footerItem: { flex: 1 },
  surfaceWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  surface: {
    height: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FBF8F4",
    borderRadius: 14,
    padding: 14
  }
});
