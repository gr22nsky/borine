import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { Calendar } from 'react-native-calendars';

import { Card, Pill, Row, Screen, SectionTitle, SubText, colors } from '@borine/ui';
import {
  countScheduledDoses,
  formatDisplayDate,
  getTodayKey,
  getWeekdayIndex,
  isBetweenDates
} from '@borine/utils';
import { useMedicationContext } from '../context/MedicationProvider';
import { Medication, TimeOfDay } from '../types';

const slotLabels: Record<TimeOfDay, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁'
};

export const HistoryScreen = () => {
  const { history, medications, loading } = useMedicationContext();
  const [selectedDate, setSelectedDate] = useState(getTodayKey());

  const selectedRecord = useMemo(() => history.find((item) => item.date === selectedDate), [history, selectedDate]);
  const activeMedications = useMemo(
    () => medications.filter((m) => isActiveForDate(m, selectedDate)),
    [medications, selectedDate]
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle>복약 기록</SectionTitle>
        <Calendar
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: colors.primary, selectedTextColor: '#fff' }
          }}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          theme={{
            calendarBackground: colors.background,
            textSectionTitleColor: colors.text,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: '#fff',
            todayTextColor: colors.primary
          }}
        />

        <Card>
          <Row spaceBetween>
            <Text style={styles.date}>{formatDisplayDate(selectedDate)}</Text>
            <SubText>
              {takenCount(selectedRecord, activeMedications)}/{scheduledCount(activeMedications)} 복용
            </SubText>
          </Row>
          <View style={styles.entryList}>
            {activeMedications.map((med) => {
              const status: Record<TimeOfDay, boolean> = selectedRecord?.taken?.[med.id] ?? {
                morning: false,
                noon: false,
                evening: false
              };
              return (
                <View key={med.id} style={styles.entryRow}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <SubText>{describeSchedule(med)}</SubText>
                  <Row>
                    {(Object.keys(slotLabels) as TimeOfDay[])
                      .filter((slot) => med.times[slot])
                      .map((slot) => (
                        <Pill
                          key={slot}
                          label={`${slotLabels[slot]} ${status[slot] ? '완료' : '미완료'}`}
                          active={!!status[slot]}
                        />
                      ))}
                  </Row>
                </View>
              );
            })}
            {activeMedications.length === 0 ? <SubText>이 날짜에 등록된 약이 없습니다.</SubText> : null}
          </View>
        </Card>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <SubText>기록을 불러오는 중...</SubText>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 24
  },
  date: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700'
  },
  entryList: {
    gap: 8
  },
  entryRow: {
    gap: 4
  },
  medName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  centerBox: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center'
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

const scheduledCount = (meds: Medication[]) =>
  meds.reduce((acc, m) => acc + countScheduledDoses({ times: m.times }), 0);

const takenCount = (
  record: { taken?: Record<string, Record<TimeOfDay, boolean>> } | undefined,
  meds: Medication[]
) => {
  if (!record) return 0;
  return meds.reduce((acc, m) => {
    const status = record.taken?.[m.id] ?? { morning: false, noon: false, evening: false };
    return acc + (status.morning ? 1 : 0) + (status.noon ? 1 : 0) + (status.evening ? 1 : 0);
  }, 0);
};
