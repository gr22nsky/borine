import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';

import { Button, Card, Chip, Row, Screen, SubText, baseFont, colors } from '@borine/ui';
import { countScheduledSlots, getTodayKey, getWeekdayIndex, isBetweenDates } from '@borine/utils';
import { AdBanner } from '../components/AdBanner';
import { useTaskContext } from '../context/TaskProvider';
import { RootStackParamList } from '../navigation/types';
import { Task, TimeOfDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

const slotOrder: TimeOfDay[] = ['morning', 'noon', 'evening'];
const slotLabels: Record<TimeOfDay, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁'
};

export const HistoryScreen = ({ navigation }: Props) => {
  const { history, tasks, loading } = useTaskContext();
  const [selectedDate, setSelectedDate] = useState(getTodayKey());

  const activeTasks = useMemo(() => tasks.filter((t) => isActiveForDate(t, selectedDate)), [tasks, selectedDate]);
  const selectedRecord = useMemo(() => history.find((item) => item.date === selectedDate), [history, selectedDate]);

  const footer = (
    <Row style={styles.footerRow}>
      <Button
        label="캘린더"
        textStyle={styles.footerBtnText}
        style={styles.footerBtn}
        onPress={() => navigation.navigate('History')}
      />
      <Button
        label="오늘할일"
        textStyle={styles.footerBtnText}
        style={styles.footerBtn}
        onPress={() => navigation.navigate('Home')}
      />
      <Button
        label="할일관리"
        textStyle={styles.footerBtnText}
        style={styles.footerBtn}
        onPress={() => navigation.navigate('TaskList')}
      />
      <Button
        label="설정"
        textStyle={styles.footerBtnText}
        style={styles.footerBtn}
        onPress={() => navigation.navigate('Settings')}
      />
    </Row>
  );

  return (
    <Screen footer={footer}>
      <Calendar
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: colors.primary, selectedTextColor: '#fff' }
        }}
        onDayPress={(day) => setSelectedDate(day.dateString)}
      />

      <Row spaceBetween style={styles.summaryRow}>
        <SubText>{selectedDate}</SubText>
        {selectedRecord ? (
          <Text style={styles.summary}>
            {takenCount(selectedRecord, activeTasks)}/{scheduledCount(activeTasks)} 완료
          </Text>
        ) : null}
      </Row>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {activeTasks.map((task) => (
          <Card key={task.id}>
            <Text style={styles.name}>{task.name}</Text>
            <SubText>{describeSchedule(task)}</SubText>
            <Row style={styles.slotRow}>
              {slotOrder.map((slot) => {
                const enabled = !!task.times[slot];
                const done = !!selectedRecord?.taken?.[task.id]?.[slot];
                return (
                  <View key={slot} style={styles.slotCell}>
                    {enabled ? (
                      <Chip label={`${slotLabels[slot]}\n${done ? '완료' : '미완료'}`} active={done} />
                    ) : (
                      <View style={styles.slotPlaceholder} />
                    )}
                  </View>
                );
              })}
            </Row>
          </Card>
        ))}

        {activeTasks.length === 0 ? <SubText>등록된 할 일이 없어요.</SubText> : null}
        <AdBanner />
      </ScrollView>

      {loading ? <SubText>불러오는 중...</SubText> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  summaryRow: {
    marginTop: 12,
    alignItems: 'center'
  },
  summary: {
    fontSize: 16,
    color: colors.text,
    fontFamily: baseFont,
    fontWeight: '700'
  },
  list: {
    gap: 12,
    paddingVertical: 16
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: baseFont
  },
  footerRow: {
    width: '100%',
    gap: 8
  },
  footerBtn: {
    flex: 1
  },
  footerBtnText: {
    fontSize: 14
  },
  slotRow: {
    alignItems: 'stretch'
  },
  slotCell: {
    flex: 1
  },
  slotPlaceholder: {
    height: 44
  }
});

const isActiveForDate = (task: Task, dateKey: string) => {
  if (!isBetweenDates(dateKey, task.startDate, task.endDate)) return false;
  if (task.recurrence.type === 'daily') return true;
  const weekday = getWeekdayIndex(dateKey);
  return task.recurrence.days.includes(weekday);
};

const describeSchedule = (task: Task) => {
  const base = `시작 ${task.startDate}` + (task.endDate ? ` ~ ${task.endDate}` : '');
  if (task.recurrence.type === 'daily') return `매일 · ${base}`;
  const daysLabel = task.recurrence.days
    .map((d) => ['일', '월', '화', '수', '목', '금', '토'][d])
    .join(', ');
  return `매주 ${daysLabel} · ${base}`;
};

const scheduledCount = (tasks: Task[]) => tasks.reduce((acc, t) => acc + countScheduledSlots({ times: t.times }), 0);

const takenCount = (record: { taken: Record<string, Record<TimeOfDay, boolean>> }, tasks: Task[]) =>
  tasks.reduce((acc, task) => acc + (record.taken?.[task.id] ? countTaken(record.taken[task.id]) : 0), 0);

const countTaken = (slots: Record<TimeOfDay, boolean>) => {
  const order: TimeOfDay[] = ['morning', 'noon', 'evening'];
  return order.filter((slot) => slots?.[slot]).length;
};
