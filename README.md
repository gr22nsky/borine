# 🌾 BORINE Monorepo Guide for VS Code & GitHub Copilot

> 이 문서는 VS Code + GitHub Copilot이 `borine` 모노레포를 정확하게 이해하고,  
> 모든 코드·UI·모듈 구조를 일관되게 생성·보완할 수 있도록 제공하는 “지침서”입니다.  
> 이 문서를 레포 안에 두면 Copilot이 자동으로 설계 규칙을 참고하게 됩니다.

---

# 1. 프로젝트 개요

- 레포 이름: **borine**
- 구조: **Android Multi-module Monorepo**
- 언어: **Kotlin**
- UI: **Jetpack Compose**
- 타겟: 시니어 친화형 앱(큰 글씨, 단순 UI, 안전한 상호작용)
- 첫 앱: **보리네 약먹기 도우미 (apps/medication)**

### 보리네 브랜드 UX 철학
- **단순함**: 모든 화면·기능은 최대 1~2단계 깊이
- **접근성**: 글자 22–28sp, 버튼 48dp+, 터치 영역 64dp+
- **안전함**: 실수 방지 팝업, 삭제/수정은 항상 확인
- **재사용성**: 모든 앱은 동일한 디자인 시스템 사용

---

# 2. 모노레포 구조 (Copilot이 반드시 이해해야 할 핵심)

```text
borine/
├ apps/
│  ├ medication/            # 보리네 약먹기 도우미 앱 (현재 개발)
│  ├ launcher/              # (TODO) 보리네 홈런처
│  └ photo-organizer/       # (TODO) 사진정리/사진찾기
│
├ core/
│  ├ model/                 # 공통 모델 (Medication, IntakeLog 등)
│  ├ database/              # Room Entity/DAO/Repository
│  └ utils/                 # 공통 유틸리티 (날짜, 시간, Formatter 등)
│
├ design-system/
│  ├ theme/                 # Color, Typography, Shape
│  └ components/            # 공통 버튼/카드/레이아웃
│
├ docs/
│  ├ BORINE_MEDICATION_APP.md       # 약먹기 도우미 기획
│  └ BORINE_DESIGN_SYSTEM.md        # 전체 UI/UX 규칙
│
└ settings.gradle.kts
```

Gradle includes:

```kotlin
include(
    ":apps:medication",
    ":core:model",
    ":core:database",
    ":core:utils",
    ":design-system:theme",
    ":design-system:components",
)
```

---

# 3. 코드 규칙 (Copilot이 따라야 하는 아키텍처)

## 3.1 레이어 구조

### design-system
- Compose Theme(colors, typography, shapes)
- 공통 UI 컴포넌트(Button, Card, SectionTitle 등)

### core:model
- data class만 포함되는 **순수 모델 영역**

### core:database
- Room Entity / DAO / Repository

### apps/* (개별 앱)
- Feature UI (Compose)
- Feature ViewModel (StateHolder)
- Navigation

---

# 4. 모델 정의 (Copilot이 생성하는 모든 코드는 이 모델 기준으로 작성됨)

## 4.1 Medication

```kotlin
package com.borine.core.model

data class Medication(
    val id: Long = 0L,
    val name: String,         // 예: 혈압약1
    val baseName: String,     // 예: 혈압약
    val useMorning: Boolean,
    val useNoon: Boolean,
    val useEvening: Boolean,
    val days: MedicationDays
)

data class MedicationDays(
    val isEveryday: Boolean = true,
    val isWeekdaysOnly: Boolean = false,
    val monday: Boolean = true,
    val tuesday: Boolean = true,
    val wednesday: Boolean = true,
    val thursday: Boolean = true,
    val friday: Boolean = true,
    val saturday: Boolean = true,
    val sunday: Boolean = true,
)
```

---

## 4.2 IntakeLog

```kotlin
package com.borine.core.model

enum class TimeSlot { MORNING, NOON, EVENING }

data class IntakeLog(
    val id: Long = 0L,
    val medicationId: Long,
    val date: String,           // yyyy-MM-dd
    val timeSlot: TimeSlot,
    val taken: Boolean,
    val takenAt: Long? = null   // timestamp
)
```

---

# 5. 자동 네이밍 규칙 (중요)

> Copilot: 새로운 약을 만들 때는 항상 아래 규칙을 따라 이름을 자동 생성해야 합니다.

```kotlin
fun generateMedicationName(
    baseName: String,
    existingNames: List<String>
): String {
    val numbers = existingNames
        .filter { it.startsWith(baseName) }
        .mapNotNull { it.removePrefix(baseName).toIntOrNull() }

    val next = if (numbers.isEmpty()) 1 else (numbers.max() + 1)
    return "$baseName$next"
}
```

---

# 6. 디자인 시스템 (Copilot이 Compose UI 생성 시 반드시 적용해야 함)

## 6.1 Colors

```kotlin
object BorineColors {
    val Background = Color(0xFFF7F2EB)
    val Primary = Color(0xFF6E8B55)
    val Text = Color(0xFF222222)
    val CardBackground = Color.White
    val Error = Color(0xFFC94A4A)
}
```

---

## 6.2 Typography

```kotlin
val BorineTypography = Typography(
    bodyLarge = TextStyle(
        fontSize = 22.sp,
        fontWeight = FontWeight.Normal
    ),
    titleLarge = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.SemiBold
    )
)
```

---

# 7. Compose UI 작성 규칙 (Copilot이 자동으로 지켜야 하는 룰)

- 기본 글자 크기 **22sp 이상**
- 제목 28sp 이상
- 버튼 높이 최소 48dp, 터치 영역 64dp+
- 모든 화면은 세로 스크롤 가능
- 삭제/변경은 반드시 “정말 삭제할까요?” 팝업 필요
- HomeScreen은 반드시 “아침 → 점심 → 저녁” 순서

---

# 8. 화면별 구조 정의 (Copilot이 화면 생성 시 따라야 함)

---

## 8.1 HomeScreen

역할:
- 오늘 날짜 표시
- 아침/점심/저녁 카드
- ○/● 상태 표시 및 변경

UI 구조:

```kotlin
@Composable
fun HomeScreen(
    state: HomeUiState,
    onToggleIntake: (medicationId: Long, timeSlot: TimeSlot) -> Unit,
    onClickHistory: () -> Unit,
    onClickManageMedication: () -> Unit,
) {
    // Copilot: Column → SectionCard 3개 (아침/점심/저녁) → 하단 버튼 구성
}
```

---

## HomeScreen UI State

```kotlin
data class HomeUiState(
    val todayText: String,
    val morningList: List<HomeMedicationItem>,
    val noonList: List<HomeMedicationItem>,
    val eveningList: List<HomeMedicationItem>
)

data class HomeMedicationItem(
    val id: Long,
    val displayName: String,
    val taken: Boolean
)
```

---

## 8.2 CalendarScreen

- 날짜 상태: ● (완료), ◐ (일부), ○ (미실시)
- 날짜 터치 시 팝업 표시

Copilot 규칙:
- Row/Column 기반 간단한 달력 구현
- 외부 라이브러리 지양

---

## 8.3 MedicationListScreen

목록:

```
혈압약1
혈압약2
당뇨약1
[약 추가하기]
```

아이템 터치 → EditMedicationScreen 이동.

---

## 8.4 AddMedicationScreen

- 추천 약 리스트
- 검색
- 직접 입력
- 복용 시간대 체크박스(아침/점심/저녁)
- 요일 선택
- “저장하기”

Copilot 규칙:
- 저장 시 자동 네이밍(generateMedicationName)

---

## 8.5 EditMedicationScreen

- 기존 UI 채움 상태
- 수정 가능
- 삭제 가능 (확인 팝업 필수)

---

# 9. Copilot이 생성할 때 지켜야 하는 최종 규칙 요약

1. **모든 UI는 Jetpack Compose로 작성**
2. **design-system의 Colors × Typography 사용 필수**
3. 기능 추가 시:
   - 모델 → core:model
   - DB → core:database
   - UI → apps/medication/ui/<feature>/
4. 약 이름은 항상 자동 번호 생성
5. 글자 최소 22sp, 버튼 48dp+
6. HomeScreen은 “아침/점심/저녁” 3섹션 고정
7. 삭제/수정 시 팝업 반드시 필요
8. 단순하고 시니어 친화적인 Flow로 유지

---

# END
이 문서는 GitHub Copilot이 보리네 모노레포 전체 규칙을 이해하도록 하기 위한 가이드입니다.
