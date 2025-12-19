# 🌾 BORINE 공통 마스터 문서

BORINE은 Expo + React Native 기반의 멀티 앱 모노레포입니다. 각 앱은 `apps/` 아래에 두고, 공통 UI/유틸/스토리지/훅은 `packages/`에서 재사용합니다.

## 1) 앱 목록

- `apps/alimi` → 보리네 알리미 (메인)
- `apps/battery` → 보리네 배터리 (준비 중)
- `apps/malhaejwo` → 보리네 말해줘 (준비 중)
- `apps/memo` → 보리네 메모 (준비 중)

## 2) 모노레포 구조

```
borine/
  apps/
    alimi/
    battery/
    malhaejwo/
    memo/
  packages/
    ui/           # 공통 UI 컴포넌트/테마 토큰
    hooks/        # 공통 React Hooks
    storage/      # AsyncStorage 래퍼/키 관리
    utils/        # 날짜/문자열/공통 로직 유틸
  android/        # (레거시) 루트 단일 네이티브 프로젝트
  docs/           # 스토어/정책 문서
  img/            # 공용 이미지(로고 등)
  screenshot/     # 스토어 등록용 캡처
  scripts/        # 빌드 자동화 스크립트
```

## 3) 공통 디자인 토큰

- primary: `#C2723A`
- background: `#F5EDE3`

폰트:
- 기본 폰트: `Cafe24Ssurround`

## 4) 공통 컴포넌트(`packages/ui`)

문서/코드에서 아래 이름을 동일하게 사용합니다.

- `colors` (테마 컬러 토큰)
- `baseFont` (기본 폰트)
- `Screen` (SafeArea + body/footer 레이아웃)
- `Card`
- `Button` (`primary`/`ghost`/`danger`)
- `TextField`
- `SectionTitle`

## 5) 개발 실행

루트에서:

- 설치: `npm install`

보리네 알리미:

- 개발 서버: `npm run alimi:start`
- 안드로이드 실행(Expo): `npm run alimi:android`

## 6) Android 빌드(앱별 APK/AAB)

### 왜 `cd android; gradlew ...`가 애매한가?

Gradle(`android/`)로 `assembleRelease`/`bundleRelease`를 실행하면 **그 시점에 존재하는 네이티브 프로젝트 1개만** 빌드됩니다.

반면 개발 실행(`npm run alimi:start`)은 워크스페이스 단위로 JS 번들/개발서버를 띄우는 개념이라, “앱이 여러 개”인 모노레포와는 결이 다릅니다.

그래서 BORINE에서는 **앱별로 prebuild → 그 앱의 Gradle로 빌드**를 자동화합니다.

### 권장: 앱별 자동 빌드 스크립트

루트에서 실행:

- APK(로컬 설치/테스트용): `npm run alimi:apk`
- AAB(Play Store 업로드용): `npm run alimi:aab`

이 스크립트는 **2단계**로 동작합니다.

1) `expo prebuild` (앱 폴더 기준으로 `apps/<app>/android` 생성)
2) `gradlew assembleRelease` 또는 `gradlew bundleRelease` 실행

결과물:

- APK: `apps/alimi/android/app/build/outputs/apk/release/app-release.apk`
- AAB: `apps/alimi/android/app/build/outputs/bundle/release/app-release.aab`
- 추가 보관(추천): `dist/android/alimi/` 아래로 자동 복사됩니다.

## 7) 에뮬레이터/기기 설치·삭제(ADB)

### 연결된 디바이스 확인

`adb devices`

여러 대가 보이면 특정 디바이스를 지정합니다.

- 1회 명령에만 지정: `adb -s emulator-5554 <command>`
- PowerShell에서 고정: `$env:ANDROID_SERIAL="emulator-5554"`

### 릴리즈 APK 설치/삭제(보리네 알리미)

패키지명(현재): `boinre.alimi`

- 설치: `adb install -r apps/alimi/android/app/build/outputs/apk/release/app-release.apk`
- 삭제: `adb uninstall boinre.alimi`
- 데이터 초기화(설정/기록 등 초기화): `adb shell pm clear boinre.alimi`
- 실행: `adb shell am start -n boinre.alimi/.MainActivity`

## 8) 스토어/정책 문서

- 개인정보처리방침: `docs/privacy-policy.md`
- 스토어 등록 문구: `docs/store-listing.md`
