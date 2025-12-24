import { NativeModules, Platform } from "react-native";

type ScreenCaptureModule = {
  requestPermissionAndCapture: () => Promise<string>;
};

function getModule(): ScreenCaptureModule {
  const mod = (NativeModules as any).ScreenCapture as ScreenCaptureModule | undefined;
  if (!mod?.requestPermissionAndCapture) {
    throw new Error(
      "ScreenCapture 네이티브 모듈을 찾을 수 없습니다. 개발 빌드(Dev Client)로 실행 중인지 확인해주세요."
    );
  }
  return mod;
}

export async function requestScreenCapturePngUri(): Promise<string> {
  if (Platform.OS !== "android") {
    throw new Error("화면 캡처 기능은 현재 Android에서만 지원합니다.");
  }

  const absPath = await getModule().requestPermissionAndCapture();
  if (!absPath) throw new Error("캡처 파일 경로를 받지 못했습니다.");

  if (absPath.startsWith("file://")) return absPath;
  return `file://${absPath}`;
}

