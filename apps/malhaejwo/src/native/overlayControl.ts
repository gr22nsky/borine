import { NativeModules, Platform } from "react-native";

type OverlayControlModule = {
  isOverlayPermissionGranted: () => Promise<boolean>;
  isServiceRunning: () => Promise<boolean>;
  openOverlayPermissionSettings: () => void;
  startOverlay: () => void;
  stopOverlay: () => void;
  setUnlockedUntil: (timestamp: number) => void;
  goHome: () => void;
  moveTaskToBack: () => void;
};

function getModule(): OverlayControlModule {
  const mod = (NativeModules as any).OverlayControl as OverlayControlModule | undefined;
  if (!mod) {
    throw new Error(
      "OverlayControl 네이티브 모듈을 찾을 수 없습니다. 개발 빌드(Dev Client)로 실행 중인지 확인해주세요."
    );
  }
  return mod;
}

export async function isOverlayPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  return getModule().isOverlayPermissionGranted();
}

export async function isServiceRunning(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  return getModule().isServiceRunning();
}

export function openOverlayPermissionSettings() {
  if (Platform.OS !== "android") return;
  getModule().openOverlayPermissionSettings();
}

export function startOverlay() {
  if (Platform.OS !== "android") return;
  getModule().startOverlay();
}

export function stopOverlay() {
  if (Platform.OS !== "android") return;
  getModule().stopOverlay();
}

export function setUnlockedUntil(timestamp: number) {
  if (Platform.OS !== "android") return;
  getModule().setUnlockedUntil(timestamp);
}

export function goHomeScreen() {
  if (Platform.OS !== "android") return;
  getModule().goHome();
}

export function moveTaskToBack() {
  if (Platform.OS !== "android") return;
  getModule().moveTaskToBack();
}
