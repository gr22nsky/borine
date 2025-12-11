import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Pill, Row, Screen, SectionTitle, SimpleModal, SubText, colors, showToast } from '@borine/ui';
import { useMedicationContext } from '../context/MedicationProvider';
import { RootStackParamList } from '../navigation/types';
import { Medication, TimeOfDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicationList'>;

const slotOrder: TimeOfDay[] = ['morning', 'noon', 'evening'];
const labels: Record<TimeOfDay, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁'
};

export const MedicationListScreen = ({ navigation }: Props) => {
  const { medications, removeMedication } = useMedicationContext();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <Screen
      footer={<Button label="약 추가하기" onPress={() => navigation.navigate('AddMedication')} />}
    >
      <SectionTitle>약 리스트</SectionTitle>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {medications.map((item) => (
          <Card key={item.id}>
            <Row spaceBetween>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <SubText>{describeSchedule(item)}</SubText>
                <Row>
                  {slotOrder
                    .filter((slot) => item.times[slot])
                    .map((slot) => (
                      <Pill key={slot} label={labels[slot]} />
                    ))}
                </Row>
              </View>
              <Button label="삭제" variant="danger" onPress={() => setTarget(item)} />
            </Row>
          </Card>
        ))}
      </ScrollView>
      {medications.length === 0 ? (
        <Text style={styles.helper}>약을 추가하여 복약을 시작하세요.</Text>
      ) : null}

      <SimpleModal
        visible={!!target}
        title="약 삭제"
        onClose={() => setTarget(null)}
        footer={
          <Row spaceBetween>
            <Button label="취소" variant="ghost" onPress={() => setTarget(null)} />
            <Button
              label="삭제"
              variant="danger"
              onPress={() => {
                if (target) {
                  removeMedication(target.id);
                  showToast('삭제되었습니다.');
                }
                setTarget(null);
              }}
            />
          </Row>
        }
      >
        <Text style={styles.helper}>
          {target ? `"${target.name}" 약을 삭제하시겠어요?` : '약을 삭제합니다.'}
        </Text>
      </SimpleModal>
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
    color: colors.text
  },
  helper: {
    marginTop: 8,
    fontSize: 16,
    color: colors.muted
  }
});

const describeSchedule = (medication: Medication) => {
  const base = `시작 ${medication.startDate}` + (medication.endDate ? ` ~ ${medication.endDate}` : '');
  if (medication.recurrence.type === 'daily') return `매일 · ${base}`;
  const daysLabel = medication.recurrence.days
    .map((d) => ['일', '월', '화', '수', '목', '금', '토'][d])
    .join(',');
  return `매주 ${daysLabel} · ${base}`;
};
