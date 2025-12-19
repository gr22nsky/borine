import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';

import {
  Button,
  Checkbox,
  Row,
  Screen,
  SectionTitle,
  SimpleModal,
  SubText,
  TextField,
  baseFont,
  colors,
  showToast
} from '@borine/ui';
import { getTodayKey } from '@borine/utils';
import { AdBanner } from '../components/AdBanner';
import { useTaskContext } from '../context/TaskProvider';
import { RootStackParamList } from '../navigation/types';
import { Recurrence, TimeOfDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTask'>;

const slots: { key: TimeOfDay; label: string }[] = [
  { key: 'morning', label: '아침' },
  { key: 'noon', label: '점심' },
  { key: 'evening', label: '저녁' }
];

const weekdays = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' }
];

export const AddTaskScreen = ({ navigation, route }: Props) => {
  const { addTask, updateTask, tasks } = useTaskContext();
  const editingId = route.params?.id;
  const target = useMemo(() => tasks.find((m) => m.id === editingId), [editingId, tasks]);

  const [name, setName] = useState('');
  const [times, setTimes] = useState<Record<TimeOfDay, boolean>>({
    morning: true,
    noon: false,
    evening: true
  });
  const [startDate, setStartDate] = useState(getTodayKey());
  const [endDate, setEndDate] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: 'daily' });
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (target) {
      setName(target.name);
      setTimes(target.times);
      setStartDate(target.startDate);
      setEndDate(target.endDate ?? '');
      setRecurrence(target.recurrence);
    }
  }, [target]);

  const toggleSlot = (slot: TimeOfDay) =>
    setTimes((prev) => ({
      ...prev,
      [slot]: !prev[slot]
    }));

  const toggleWeekday = (day: number) => {
    setRecurrence((prev) => {
      if (prev.type !== 'weekly') return { type: 'weekly', days: [day] };
      const exists = prev.days.includes(day);
      const nextDays = exists ? prev.days.filter((d) => d !== day) : [...prev.days, day];
      return { type: 'weekly', days: nextDays.sort() };
    });
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('할 일을 입력해주세요.');
      return;
    }

    if (!times.morning && !times.noon && !times.evening) {
      Alert.alert('시간대를 선택해주세요.');
      return;
    }

    if (endDate && endDate < startDate) {
      Alert.alert('기간이 올바르지 않습니다.', '종료일이 시작일보다 빠릅니다.');
      return;
    }

    if (recurrence.type === 'weekly' && recurrence.days.length === 0) {
      Alert.alert('주기를 선택해주세요.', '매주 반복할 요일을 선택해주세요.');
      return;
    }

    try {
      setSaving(true);
      const payloadTimes = { ...times };
      const saved = editingId
        ? await updateTask(editingId, {
            name: trimmed,
            times: payloadTimes,
            startDate,
            endDate: endDate || undefined,
            recurrence
          })
        : await addTask(trimmed, payloadTimes, startDate, endDate || undefined, recurrence);

      if (saved) {
        showToast('저장되었습니다.');
        navigation.goBack();
      } else {
        Alert.alert('저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      console.warn('save failed', err);
      Alert.alert('오류', '문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <Row spaceBetween>
          <Button label="취소" variant="ghost" onPress={() => navigation.goBack()} />
          <Button label="저장하기" onPress={onSave} disabled={saving} />
        </Row>
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle>{editingId ? '할 일 수정하기' : '할 일 등록하기'}</SectionTitle>

        <View style={styles.block}>
          <SubText>할 일</SubText>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="예) 아침 산책하기"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
        </View>

        <View style={styles.block}>
          <SubText>기간</SubText>
          <Row>
            <Pressable style={styles.dateField} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.dateText}>{startDate || '시작일 선택'}</Text>
            </Pressable>
            <Pressable style={styles.dateField} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.dateText}>{endDate || '종료일 선택'}</Text>
            </Pressable>
          </Row>
        </View>

        <View style={styles.block}>
          <SubText>주기</SubText>
          <Row>
            <Checkbox
              label="매일"
              checked={recurrence.type === 'daily'}
              onChange={() => setRecurrence({ type: 'daily' })}
            />
            <Checkbox
              label="매주"
              checked={recurrence.type === 'weekly'}
              onChange={() =>
                setRecurrence((prev) =>
                  prev.type === 'weekly' ? prev : { type: 'weekly', days: [1, 2, 3, 4, 5] }
                )
              }
            />
          </Row>
          {recurrence.type === 'weekly' ? (
            <View style={styles.weekdaysRow}>
              {weekdays.map((day) => (
                <Checkbox
                  key={day.value}
                  label={day.label}
                  checked={recurrence.type === 'weekly' && recurrence.days.includes(day.value)}
                  onChange={() => toggleWeekday(day.value)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.block}>
          <SubText>알림 시간</SubText>
          <Row>
            {slots.map((slot) => (
              <Checkbox
                key={slot.key}
                label={slot.label}
                checked={times[slot.key]}
                onChange={() => toggleSlot(slot.key)}
              />
            ))}
          </Row>
        </View>
      </ScrollView>

      <SimpleModal visible={showStartPicker} title="시작일 선택" onClose={() => setShowStartPicker(false)}>
        <Calendar
          markedDates={{
            [startDate]: { selected: true, selectedColor: colors.primary, selectedTextColor: '#fff' }
          }}
          onDayPress={(day) => {
            setStartDate(day.dateString);
            setShowStartPicker(false);
          }}
        />
      </SimpleModal>

      <SimpleModal visible={showEndPicker} title="종료일 선택" onClose={() => setShowEndPicker(false)}>
        <Calendar
          markedDates={
            endDate
              ? {
                  [endDate]: { selected: true, selectedColor: colors.primary, selectedTextColor: '#fff' }
                }
              : undefined
          }
          onDayPress={(day) => {
            setEndDate(day.dateString);
            setShowEndPicker(false);
          }}
        />
      </SimpleModal>

      <AdBanner />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 24
  },
  block: {
    gap: 8
  },
  dateField: {
    flex: 1,
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  dateText: {
    fontSize: 18,
    color: colors.text,
    fontFamily: baseFont
  },
  weekdaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 8
  }
});
