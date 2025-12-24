import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Chip, Row, Screen, SectionTitle, SubText, baseFont, colors } from '@borine/ui';
import { getTodayKey, getWeekdayIndex, isBetweenDates } from '@borine/utils';
import { AdBanner } from '../components/AdBanner';
import { useTaskContext } from '../context/TaskProvider';
import { RootStackParamList } from '../navigation/types';
import { Task, TimeOfDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const slots: { key: TimeOfDay; label: string }[] = [
  { key: 'morning', label: '아침' },
  { key: 'noon', label: '점심' },
  { key: 'evening', label: '저녁' }
];

export const HomeScreen = ({ navigation }: Props) => {
  const { tasks, todayLog, toggleIntake, loading } = useTaskContext();
  const todayKey = getTodayKey();
  const weekdayLabel = ['일', '월', '화', '수', '목', '금', '토'][getWeekdayIndex(todayKey)];

  const activeTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) => isActiveForDate(t, todayKey))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko', { sensitivity: 'base' })),
    [tasks, todayKey]
  );

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

  if (loading) {
    return (
      <Screen footer={footer}>
        <Text style={styles.helper}>불러오는 중...</Text>
      </Screen>
    );
  }

  return (
    <Screen footer={footer}>
      <Row style={styles.headerRow}>
        <Text style={styles.dateText}>{todayKey}</Text>
        <SubText style={styles.weekdayText}>{`${weekdayLabel}요일`}</SubText>
      </Row>

      {activeTasks.length === 0 ? (
        <>
          <Text style={styles.helper}>오늘 할 일이 없어요. 할 일을 추가해보세요.</Text>
          <Button label="할 일 추가하기" style={styles.addBtn} onPress={() => navigation.navigate('AddTask')} />
        </>
      ) : (
        <SubText style={styles.countText}>{`오늘 할일이 ${activeTasks.length}개 있어요`}</SubText>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {activeTasks.map((task) => (
          <Card key={task.id}>
            <Text style={styles.name}>{task.name}</Text>
            <SubText>{describeSchedule(task)}</SubText>
            <Row style={styles.slotRow}>
              {slots.map((slot) => {
                const enabled = !!task.times[slot.key];
                const done = !!todayLog?.taken?.[task.id]?.[slot.key];
                return (
                  <View key={slot.key} style={styles.slotCell}>
                    {enabled ? (
                      <Chip
                        label={`${slot.label}\n${done ? '완료' : '미완료'}`}
                        active={done}
                        onPress={() => toggleIntake(task.id, slot.key)}
                      />
                    ) : (
                      <View style={styles.slotPlaceholder} />
                    )}
                  </View>
                );
              })}
            </Row>
          </Card>
        ))}
        <AdBanner />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 20
  },
  dateText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    fontFamily: baseFont
  },
  headerRow: {
    alignItems: 'flex-end'
  },
  weekdayText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
    marginBottom: 4
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: baseFont
  },
  helper: {
    marginTop: 8,
    fontSize: 16,
    color: colors.muted,
    fontFamily: baseFont
  },
  addBtn: {
    marginTop: 10
  },
  countText: {
    marginTop: 6
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
