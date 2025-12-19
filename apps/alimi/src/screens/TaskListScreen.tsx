import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Button,
  Card,
  Chip,
  Row,
  Screen,
  SimpleModal,
  SubText,
  baseFont,
  colors,
  showToast
} from '@borine/ui';
import { AdBanner } from '../components/AdBanner';
import { useTaskContext } from '../context/TaskProvider';
import { RootStackParamList } from '../navigation/types';
import { Task, TimeOfDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskList'>;

const slotOrder: TimeOfDay[] = ['morning', 'noon', 'evening'];
const labels: Record<TimeOfDay, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁'
};

export const TaskListScreen = ({ navigation }: Props) => {
  const { tasks, removeTask } = useTaskContext();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.name.localeCompare(b.name, 'ko', { sensitivity: 'base' })),
    [tasks]
  );

  return (
    <Screen
      footer={
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
      }
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {sorted.map((item) => (
          <Card key={item.id}>
            <Row spaceBetween>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <SubText>{describeSchedule(item)}</SubText>
                <Row style={styles.slotRow}>
                  {slotOrder.map((slot) => (
                    <View key={slot} style={styles.slotCell}>
                      {item.times[slot] ? <Chip label={labels[slot]} /> : <View style={styles.slotPlaceholder} />}
                    </View>
                  ))}
                </Row>
              </View>
              <View style={styles.actions}>
                <Button
                  label="수정"
                  variant="ghost"
                  onPress={() => navigation.navigate('AddTask', { id: item.id })}
                />
                <Button label="삭제" variant="danger" onPress={() => setTarget(item)} />
              </View>
            </Row>
          </Card>
        ))}
        <AdBanner />
      </ScrollView>
      {tasks.length === 0 ? <Text style={styles.helper}>할 일을 추가해보세요.</Text> : null}

      <SimpleModal
        visible={!!target}
        title="삭제"
        onClose={() => setTarget(null)}
        footer={
          <Row spaceBetween>
            <Button label="취소" variant="ghost" onPress={() => setTarget(null)} />
            <Button
              label="삭제"
              variant="danger"
              onPress={() => {
                if (target) {
                  removeTask(target.id);
                  showToast('삭제되었습니다.');
                }
                setTarget(null);
              }}
            />
          </Row>
        }
      >
        <Text style={styles.helper}>
          {target ? `"${target.name}"을 삭제할까요?` : '삭제하시겠습니까?'}
        </Text>
      </SimpleModal>

      <Button
        label="할 일 추가하기"
        style={{ marginTop: 12 }}
        onPress={() => navigation.navigate('AddTask')}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20,
    gap: 12
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
  actions: {
    gap: 8
  },
  footerBtn: {
    flex: 1
  },
  footerBtnText: {
    fontSize: 14
  },
  footerRow: {
    gap: 8
  },
  slotRow: {
    alignItems: 'stretch'
  },
  slotCell: {
    flex: 1
  },
  slotPlaceholder: {
    height: 40
  }
});

const describeSchedule = (task: Task) => {
  const base = `시작 ${task.startDate}` + (task.endDate ? ` ~ ${task.endDate}` : '');
  if (task.recurrence.type === 'daily') return `매일 · ${base}`;
  const daysLabel = task.recurrence.days
    .map((d) => ['일', '월', '화', '수', '목', '금', '토'][d])
    .join(', ');
  return `매주 ${daysLabel} · ${base}`;
};
