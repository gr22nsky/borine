# 🌾 BORINE

### 보리네 앱 마스터 기획서 – Expo + React Native 기반

### (VSCode Copilot / GPT 최적화 버전)

---

## 1. 보리네 프로젝트 개요

보리네(Borine)는 시니어를 위한 초간단 생활 도우미 앱 시리즈이다.

핵심 철학은 다음 세 가지이다.

1. 누구든지 쓸 수 있을 만큼 단순할 것
2. 앱 하나는 기능 하나만 수행할 것
3. 모든 보리네 앱은 UI/UX 패턴이 완전히 통일될 것

즉, 사용자는 어느 보리네 앱이든 동일한 구조 안에서 쉽게 사용할 수 있게 된다.

---

## 2. 기술 스택 (보리네 전체 공통)

* Expo + React Native
* TypeScript
* React Navigation
* AsyncStorage
* 필요 시 Expo 모듈 추가
* UI는 React Native 기본 컴포넌트 중심

---

## 3. 공통 폴더 구조 (VSCode Copilot 최적화)

모든 보리네 앱은 동일 폴더 구조를 사용한다.

borine/
 ├ apps/
 │   ├ medication/
 │   ├ alarm/
 │   └ memo/
 ├ packages/
 │   ├ ui/
 │   ├ hooks/
 │   ├ storage/
 │   └ utils/
 └ package.json (workspace root)

---

## 4. UI/UX 공통 규칙

### 글자 크기

* 제목(H1): 28~32px
* 섹션 제목(H2): 22~24px
* 본문: 18~20px
* 버튼 텍스트: 최소 20px

### 버튼 규칙

* 터치 영역 최소 48px
* 주요 버튼(저장/확인)은 화면 하단에 크게 배치
* 취소 버튼은 텍스트 형태로 제공

### 색상 규칙

* Primary 색상: #2C6EFD
* 텍스트: #1B1B1B
* 배경: #FFFFFF
* Error: 고대비 빨간색

### 네비게이션

* 기본적으로 2개 이상의 스크린으로 구성
* HomeScreen → ManageScreen 구조
* 헤더는 큰 글씨
* 뒤로 가기 버튼 항상 제공

---

## 5. 데이터 저장 규칙 (AsyncStorage)

### 키 네이밍 규칙

BORINE_`<APPNAME>`_`<ENTITY>`

예시:

* BORINE_MEDICATION_LIST
* BORINE_MEDICATION_HISTORY
* BORINE_MEMO_LIST

### 날짜 규칙

* 항상 YYYY-MM-DD 문자열 사용

### ID 규칙

* 모든 데이터 엔티티는 uuid를 사용

---

## 6. 보리네 시리즈 1번 앱: 보리네 약먹기 도우미

보리네 앱들의 최초 버전이자 핵심 앱이다.

목표는 다음 두 문장을 해결하는 것이다.

“오늘 약 먹었는지 기억이 안 난다.”

“약이 많아서 헷갈린다.”

---

## 6.1 기능 목록 (MVP)

1. 오늘 날짜 표시
2. 오늘 복약해야 할 약 리스트
3. ○ → ● 로 복약 체크
4. 약 등록/삭제
5. 날짜별 히스토리 조회

---

## 6.2 데이터 모델

Medication

* id
* name
* times(아침/점심/저녁 boolean)

DailyIntake

* date(YYYY-MM-DD)
* taken { medicationId : { morning, noon, evening } }

---

## 6.3 저장 구조

* BORINE_MEDICATION_LIST : Medication[]
* BORINE_MEDICATION_HISTORY : DailyIntake[]

---

## 6.4 Hook 구조

useMedications

* medications
* addMedication
* removeMedication

useHistory

* todayIntake
* toggleIntake
* getIntakeByDate

---

## 6.5 화면 명세

### HomeScreen

* 오늘 날짜
* “오늘 드셔야 할 약: n개”
* 아침/점심/저녁 카드
* ○/● 토글
* 아래 버튼 2개: 기록 보기, 약 관리

### MedicationListScreen

* 약 리스트
* 휴지통 아이콘 터치 → 삭제
* “약 추가하기” 버튼

### AddMedicationScreen

* 약 이름 입력
* 아침/점심/저녁 체크박스
* “저장하기” 버튼

### HistoryScreen

* 달력 또는 날짜 리스트
* 해당 날짜 복약 여부 표시

---

## 7. 개발 로드맵

1. Expo 프로젝트 생성
2. Navigation 설치
3. 폴더 구조 생성
4. Storage 유틸 작성
5. Hooks 작성
6. HomeScreen 개발
7. 기타 화면 개발
8. 최종 Navigation 연결

---

## 8. Copilot 최적화 규칙 요약

* 모든 화면은 src/screens에 위치
* 모든 로직은 src/hooks
* 모든 저장은 src/storage
* 모든 타입은 screens/types.ts
* 날짜는 YYYY-MM-DD
* 네이밍은 camelCase
* UI는 단순·고대비·큰 글씨

---

## 9. 보리네 전체 시리즈 확장 계획

* 보리네 약먹기 도우미
* 보리네 알람
* 보리네 메모
* 등

모든 앱이 동일한 구조와 규칙을 사용하여

개발 속도는 빨라지고

사용자 경험은 통일된다.

---

## 10. 시작하기 (현재 구축된 상태)

1. 의존성 설치: `npm install`
2. 약먹기 앱 실행: `npm run medication:start` (웹은 `npm run medication:web`)
3. 폴더 구조: `apps/medication`에 Expo 앱, `packages/*`에 공용 모듈
4. 네비게이션: React Navigation 네이티브 스택 적용, 기본 화면 4개(Home/약 리스트/약 추가/기록)
5. 데이터: AsyncStorage에 `BORINE_MEDICATION_LIST`, `BORINE_MEDICATION_HISTORY` 키로 저장
6. 자산: `apps/medication/assets`에 아이콘/스플래시 기본 색상(Primary #2C6EFD) 적용

## 11. 품질/빌드 도구

* Lint: `npm run lint` (ESLint flat config)
* 포맷: `npm run format` (Prettier)
* 타입 체크: `npm run typecheck --workspace apps/medication`
* EAS: `apps/medication/eas.json` 프로파일(development/preview/production) 작성, 아이콘/스플래시는 `apps/medication/assets` 내 기본 파일 교체
