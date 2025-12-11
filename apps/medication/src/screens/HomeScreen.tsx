import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Pill, Row, Screen, SectionTitle, SubText, colors } from '@borine/ui';
import { formatDisplayDate, getTodayKey, getWeekdayIndex, isBetweenDates } from '@borine/utils';
import { useMedicationContext } from '../context/MedicationProvider';
import { RootStackParamList } from '../navigation/types';
import { Medication, TimeOfDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const timeSlots: { key: TimeOfDay; label: string }[] = [
  { key: 'morning', label: '아침' },
  { key: 'noon', label: '점심' },
  { key: 'evening', label: '저녁' }
];

export const HomeScreen = ({ navigation }: Props) => {
  const { medications, todayIntake, toggleIntake, loading } = useMedicationContext();
  const todayKey = getTodayKey();

  const sortedMedications = useMemo(
    () =>
      medications
        .filter((m) => isActiveForDate(m, todayKey))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko', { sensitivity: 'base' })),
    [medications, todayKey]
  );

  const summaryText = useMemo(() => {
    const total = sortedMedications.length;
    return `오늘 드셔야 할 약: ${total}개`;
  }, [sortedMedications]);

  return (
    <Screen
      footer={
        <Row spaceBetween>
          <Button label="기록 보기" variant="ghost" onPress={() => navigation.navigate('History')} />
          <Button label="약 관리" onPress={() => navigation.navigate('MedicationList')} />
        </Row>
      }
    >
      <SectionTitle>{formatDisplayDate(todayKey)}</SectionTitle>
      <SubText>{summaryText}</SubText>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <SubText>약 정보를 불러오는 중...</SubText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {sortedMedications.map((medication) => (
            <Card key={medication.id}>
              <Row spaceBetween>
                <View>
                <Text style={styles.medName}>{medication.name}</Text>
                <SubText>{describeSchedule(medication)}</SubText>
                <Row>
                  {timeSlots
                    .filter((slot) => medication.times[slot.key])
                    .map((slot) => (
                        <Pill key={slot.key} label={slot.label} />
                      ))}
                  </Row>
                </View>
              </Row>

              <Row spaceBetween>
                {timeSlots.map((slot) =>
                  medication.times[slot.key] ? (
                    <TimeToggle
                      key={slot.key}
                      label={slot.label}
                      active={!!todayIntake?.taken?.[medication.id]?.[slot.key]}
                      onPress={() => toggleIntake(medication.id, slot.key)}
                    />
                  ) : (
                    <View key={slot.key} style={styles.emptySlot} />
                  )
                )}
              </Row>
            </Card>
          ))}

          {sortedMedications.length === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>등록된 약이 없습니다.</Text>
              <SubText>약을 추가하고 복약 기록을 시작하세요.</SubText>
              <Button label="약 추가하기" onPress={() => navigation.navigate('AddMedication')} />
            </Card>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
};

const TimeToggle = ({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.toggle,
      active ? styles.toggleActive : null,
      pressed ? styles.togglePressed : null
    ]}
  >
    <Text style={[styles.toggleText, active ? styles.toggleTextActive : null]}>
      {active ? '●' : '○'} {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20,
    gap: 12
  },
  medName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  emptySlot: {
    flex: 1
  },
  toggle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  toggleActive: {
    borderColor: colors.primary,
    backgroundColor: '#EAF1FF'
  },
  togglePressed: {
    opacity: 0.9
  },
  toggleText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600'
  },
  toggleTextActive: {
    color: colors.primary
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  }
});

const isActiveForDate = (medication: Medication, dateKey: string) => {
  if (!isBetweenDates(dateKey, medication.startDate, medication.endDate)) return false;
  if (medication.recurrence.type === 'daily') return true;
  const weekday = getWeekdayIndex(dateKey);
  return medication.recurrence.days.includes(weekday);
};

const describeSchedule = (medication: Medication) => {
  const base = `시작 ${medication.startDate}` + (medication.endDate ? ` ~ ${medication.endDate}` : '');
  if (medication.recurrence.type === 'daily') return `매일 · ${base}`;
  const daysLabel = medication.recurrence.days
    .map((d) => ['일', '월', '화', '수', '목', '금', '토'][d])
    .join(',');
  return `매주 ${daysLabel} · ${base}`;
};
