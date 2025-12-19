import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Row, Screen, SectionTitle, SubText, baseFont, colors, showToast } from '@borine/ui';
import { loadJson } from '@borine/storage';
import { getTodayKey, getWeekdayIndex, isBetweenDates } from '@borine/utils';
import { AdBanner } from '../components/AdBanner';
import { useTaskContext } from '../context/TaskProvider';
import { RootStackParamList } from '../navigation/types';
import { refreshTaskNotifications } from '../notifications/scheduler';
import { STORAGE_KEYS } from '../storage/keys';
import {
  defaultMealTimes,
  loadMealTimes,
  loadNotificationEnabled,
  MealTimes,
  saveMealTimes,
  saveNotificationEnabled
} from '../storage/settings';
import { Task, TimeOfDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const PRIVACY_URL = 'https://www.notion.so/2cbfb3337dc880be9b5bf7076ca6fb9a?source=copy_link';

const slotOrder: TimeOfDay[] = ['morning', 'noon', 'evening'];
const slotLabels: Record<TimeOfDay, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁'
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const SettingsScreen = ({ navigation }: Props) => {
  const { tasks, history } = useTaskContext();

  const [times, setTimes] = useState<MealTimes>(defaultMealTimes);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);

  const [pickerSlot, setPickerSlot] = useState<TimeOfDay | null>(null);
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);

  useEffect(() => {
    void (async () => {
      const [storedTimes, enabled] = await Promise.all([loadMealTimes(), loadNotificationEnabled()]);
      setTimes(storedTimes);
      setNotificationsEnabled(enabled);
      setLoading(false);
    })();
  }, []);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => {
      if (h.date?.length >= 7) set.add(h.date.slice(0, 7));
    });
    return Array.from(set).sort();
  }, [history]);

  const monthToShow = selectedMonth || availableMonths[availableMonths.length - 1] || '';

  const changeMonth = (dir: -1 | 1) => {
    if (!monthToShow) return;
    const idx = availableMonths.indexOf(monthToShow);
    const next = availableMonths[idx + dir];
    if (next) setSelectedMonth(next);
  };

  const openPicker = (slot: TimeOfDay) => {
    const current = times[slot] || defaultMealTimes[slot];
    const [h, m] = current.split(':').map((n) => Number(n));
    setPickerHour(Number.isFinite(h) ? h : 8);
    setPickerMinute(Number.isFinite(m) ? m : 0);
    setPickerSlot(slot);
  };

  const closePicker = () => setPickerSlot(null);

  const commitPicker = async () => {
    if (!pickerSlot) return;
    const next = `${pad2(pickerHour)}:${pad2(pickerMinute)}`;
    const nextTimes = { ...times, [pickerSlot]: next };
    setTimes(nextTimes);
    closePicker();

    await saveMealTimes(nextTimes);
    await refreshTaskNotifications(tasks, history);
    showToast('알림 시간이 저장되었습니다.');
  };

  const onToggleNotifications = async (next: boolean) => {
    setNotificationsEnabled(next);
    await saveNotificationEnabled(next);
    await refreshTaskNotifications(tasks, history);
    showToast(next ? '알림을 켰습니다.' : '알림을 껐습니다.');
  };

  const shareHistory = async () => {
    const latestHistory = await loadJson(STORAGE_KEYS.TASK_HISTORY, history);

    if (!monthToShow) {
      Alert.alert('공유할 기록이 없어요.', '기록이 있는 달을 먼저 선택해주세요.');
      return;
    }

    const days = latestHistory
      .filter((day) => day.date.startsWith(monthToShow))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    if (days.length === 0) {
      Alert.alert('선택한 기간에 기록이 없습니다.');
      return;
    }

    const lines: string[] = [];
    lines.push('보리네 알리미 · 일정 기록');
    lines.push(`내보낸 날짜: ${getTodayKey()} · 기간: ${monthToShow}`);
    lines.push('');

    days.forEach((day) => {
      const activeTasks = tasks.filter((t) => isActiveForDate(t, day.date));
      if (activeTasks.length === 0) return;

      const dayLines: string[] = [];
      dayLines.push(day.date);

      activeTasks
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ko', { sensitivity: 'base' }))
        .forEach((task) => {
          const slotTexts = slotOrder
            .filter((slot) => task.times[slot])
            .map((slot) => {
              const done = !!day.taken?.[task.id]?.[slot];
              return `${slotLabels[slot]} ${done ? '완료' : '미완료'}`;
            });
          if (slotTexts.length === 0) return;
          dayLines.push(`- ${task.name}: ${slotTexts.join(', ')}`);
        });

      if (dayLines.length > 1) {
        lines.push(...dayLines);
        lines.push('');
      }
    });

    const text = lines.join('\n').trim();
    if (!text.includes('- ')) {
      Alert.alert('선택한 기간에 공유할 내용이 없습니다.');
      return;
    }

    try {
      await Share.share({ message: text });
    } catch (err) {
      console.warn('share failed', err);
      Alert.alert('공유에 실패했습니다.');
    }
  };

  const openPrivacy = () => Linking.openURL(PRIVACY_URL).catch(() => Alert.alert('페이지를 열 수 없습니다.'));

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle>설정</SectionTitle>

        <Card>
          <Row spaceBetween style={{ alignItems: 'center' }}>
            <SectionTitle style={styles.cardTitle}>알림</SectionTitle>
            <Row style={{ alignItems: 'center' }}>
              <SubText>{notificationsEnabled ? '켜짐' : '꺼짐'}</SubText>
              <Switch value={notificationsEnabled} onValueChange={onToggleNotifications} />
            </Row>
          </Row>

          <SectionTitle style={styles.cardSubtitle}>알림 시간</SectionTitle>

          <View style={styles.block}>
            <SubText>아침</SubText>
            <Pressable style={styles.timeField} onPress={() => openPicker('morning')}>
              <Text style={styles.timeText}>{times.morning}</Text>
            </Pressable>
          </View>
          <View style={styles.block}>
            <SubText>점심</SubText>
            <Pressable style={styles.timeField} onPress={() => openPicker('noon')}>
              <Text style={styles.timeText}>{times.noon}</Text>
            </Pressable>
          </View>
          <View style={styles.block}>
            <SubText>저녁</SubText>
            <Pressable style={styles.timeField} onPress={() => openPicker('evening')}>
              <Text style={styles.timeText}>{times.evening}</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <SectionTitle style={styles.cardTitle}>기록 공유하기</SectionTitle>

          {availableMonths.length === 0 ? (
            <SubText>아직 기록이 없어요.</SubText>
          ) : (
            <>
              <View style={styles.monthBar}>
                <Button
                  label="◀"
                  variant="ghost"
                  onPress={() => changeMonth(-1)}
                  disabled={!canMoveMonth(-1, availableMonths, monthToShow)}
                  style={styles.monthBtn}
                />
                <Text style={styles.monthText}>{monthToShow}</Text>
                <Button
                  label="▶"
                  variant="ghost"
                  onPress={() => changeMonth(1)}
                  disabled={!canMoveMonth(1, availableMonths, monthToShow)}
                  style={styles.monthBtn}
                />
              </View>

              <Button label="기록 공유하기" onPress={shareHistory} style={{ marginTop: 8 }} />
            </>
          )}
        </Card>

        <Card>
          <SectionTitle style={styles.cardTitle}>개인정보처리방침</SectionTitle>
          <Button label="열어보기" variant="ghost" onPress={openPrivacy} />
        </Card>

        <AdBanner />
      </ScrollView>

      <TimePickerOverlay
        visible={!!pickerSlot}
        title={pickerSlot ? `${slotLabels[pickerSlot]} 알림 시간` : '알림 시간'}
        hour={pickerHour}
        minute={pickerMinute}
        onChangeHour={setPickerHour}
        onChangeMinute={setPickerMinute}
        onClose={closePicker}
        onConfirm={commitPicker}
      />
    </Screen>
  );
};

const canMoveMonth = (dir: -1 | 1, list: string[], current: string) => {
  if (!current) return false;
  const idx = list.indexOf(current);
  return dir === -1 ? idx > 0 : idx >= 0 && idx < list.length - 1;
};

const isActiveForDate = (task: Task, dateKey: string) => {
  if (!isBetweenDates(dateKey, task.startDate, task.endDate)) return false;
  if (task.recurrence.type === 'daily') return true;
  const weekday = getWeekdayIndex(dateKey);
  return task.recurrence.days.includes(weekday);
};

const TimePickerOverlay = ({
  visible,
  title,
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
  onClose,
  onConfirm
}: {
  visible: boolean;
  title: string;
  hour: number;
  minute: number;
  onChangeHour: (v: number) => void;
  onChangeMinute: (v: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  if (!visible) return null;

  return (
    <View style={pickerStyles.overlay}>
      <View style={pickerStyles.card}>
        <Text style={pickerStyles.title}>{title}</Text>
        <SubText style={pickerStyles.preview}>{`${pad2(hour)}:${pad2(minute)}`}</SubText>

        <Row style={pickerStyles.columns}>
          <ScrollView style={pickerStyles.col} contentContainerStyle={pickerStyles.colContent}>
            {hours.map((h) => (
              <Pressable
                key={h}
                style={[pickerStyles.item, hour === h ? pickerStyles.itemActive : null]}
                onPress={() => onChangeHour(h)}
              >
                <Text style={[pickerStyles.itemText, hour === h ? pickerStyles.itemTextActive : null]}>
                  {pad2(h)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={pickerStyles.col} contentContainerStyle={pickerStyles.colContent}>
            {minutes.map((m) => (
              <Pressable
                key={m}
                style={[pickerStyles.item, minute === m ? pickerStyles.itemActive : null]}
                onPress={() => onChangeMinute(m)}
              >
                <Text style={[pickerStyles.itemText, minute === m ? pickerStyles.itemTextActive : null]}>
                  {pad2(m)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Row>

        <Row spaceBetween style={{ marginTop: 12 }}>
          <Button label="취소" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button label="확인" onPress={onConfirm} style={{ flex: 1 }} />
        </Row>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 24
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
  cardTitle: {
    fontSize: 20
  },
  cardSubtitle: {
    marginTop: 8,
    fontSize: 18
  },
  block: {
    gap: 6,
    marginTop: 8
  },
  helper: {
    fontSize: 16,
    color: colors.muted,
    fontFamily: baseFont
  },
  timeField: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  timeText: {
    fontSize: 18,
    color: colors.text,
    fontFamily: baseFont
  },
  monthBar: {
    marginTop: 8,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  monthBtn: {
    minWidth: 52
  },
  monthText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: colors.text,
    fontFamily: baseFont
  }
});

const pickerStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: baseFont
  },
  preview: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 22,
    color: colors.text
  },
  columns: {
    marginTop: 12,
    alignItems: 'stretch'
  },
  col: {
    flex: 1,
    maxHeight: 260,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12
  },
  colContent: {
    paddingVertical: 8
  },
  item: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  itemActive: {
    backgroundColor: '#EAF1FF'
  },
  itemText: {
    fontSize: 18,
    color: colors.text,
    fontFamily: baseFont
  },
  itemTextActive: {
    color: colors.primary,
    fontWeight: '700'
  }
});
