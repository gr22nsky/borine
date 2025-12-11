import { ReactNode } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  primary: '#C2723A',
  text: '#2B1B12',
  background: '#F5EDE3',
  muted: '#7C6A5C',
  border: '#E5D6C6',
  card: '#FFFFFF',
  danger: '#B3261E'
};

type ScreenProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export const Screen = ({ children, footer }: ScreenProps) => (
  <SafeAreaView style={uiStyles.screen}>
    <View style={uiStyles.body}>{children}</View>
    {footer ? <View style={uiStyles.footer}>{footer}</View> : null}
  </SafeAreaView>
);

type CardProps = {
  children: ReactNode;
};

export const Card = ({ children }: CardProps) => <View style={uiStyles.card}>{children}</View>;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
};

export const Button = ({ label, onPress, variant = 'primary', disabled }: ButtonProps) => {
  const variantStyle =
    variant === 'primary'
      ? uiStyles.buttonPrimary
      : variant === 'danger'
      ? uiStyles.buttonDanger
      : uiStyles.buttonGhost;
  const textStyle =
    variant === 'primary'
      ? uiStyles.buttonPrimaryText
      : variant === 'danger'
      ? uiStyles.buttonDangerText
      : uiStyles.buttonGhostText;

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        uiStyles.buttonBase,
        variantStyle,
        pressed && !disabled ? uiStyles.buttonPressed : null,
        disabled ? uiStyles.buttonDisabled : null
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[uiStyles.buttonText, textStyle]}>{label}</Text>
    </Pressable>
  );
};

type FieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send' | 'none';
  onSubmitEditing?: () => void;
};

export const TextField = ({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  returnKeyType,
  onSubmitEditing
}: FieldProps) => (
  <TextInput
    style={uiStyles.input}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={colors.muted}
    autoFocus={autoFocus}
    returnKeyType={returnKeyType}
    onSubmitEditing={onSubmitEditing}
  />
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Text style={uiStyles.sectionTitle}>{children}</Text>
);

export const SubText = ({ children }: { children: ReactNode }) => (
  <Text style={uiStyles.subText}>{children}</Text>
);

export const Row = ({ children, spaceBetween }: { children: ReactNode; spaceBetween?: boolean }) => (
  <View style={[uiStyles.row, spaceBetween ? uiStyles.rowBetween : null]}>{children}</View>
);

export const Pill = ({ label, active }: { label: string; active?: boolean }) => (
  <View style={[uiStyles.pill, active ? uiStyles.pillActive : null]}>
    <Text style={[uiStyles.pillText, active ? uiStyles.pillTextActive : null]}>{label}</Text>
  </View>
);

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

export const Checkbox = ({ label, checked, onChange }: CheckboxProps) => (
  <Pressable
    accessibilityRole="checkbox"
    onPress={() => onChange(!checked)}
    style={({ pressed }) => [
      uiStyles.checkbox,
      pressed ? uiStyles.checkboxPressed : null
    ]}
  >
    <View style={[uiStyles.checkboxBox, checked ? uiStyles.checkboxBoxChecked : null]}>
      {checked ? <Text style={uiStyles.checkboxMark}>✓</Text> : null}
    </View>
    <Text style={uiStyles.checkboxLabel}>{label}</Text>
  </Pressable>
);

type SimpleModalProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export const SimpleModal = ({ visible, title, onClose, children, footer }: SimpleModalProps) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
    <View style={uiStyles.modalOverlay}>
      <View style={uiStyles.modalCard}>
        {title ? <Text style={uiStyles.modalTitle}>{title}</Text> : null}
        <View style={uiStyles.modalBody}>{children}</View>
        <View style={uiStyles.modalFooter}>
          {footer ?? <Button label="닫기" variant="ghost" onPress={onClose} />}
        </View>
      </View>
    </View>
  </Modal>
);

export const showToast = (message: string) => {
  if (!message) return;
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message);
  }
};

const uiStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  buttonBase: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  buttonPrimary: {
    backgroundColor: colors.primary
  },
  buttonDanger: {
    backgroundColor: colors.danger
  },
  buttonGhost: {
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600'
  },
  buttonPrimaryText: {
    color: '#fff'
  },
  buttonDangerText: {
    color: '#fff'
  },
  buttonGhostText: {
    color: colors.text
  },
  buttonPressed: {
    opacity: 0.8
  },
  buttonDisabled: {
    opacity: 0.5
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: colors.text,
    backgroundColor: '#fff'
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text
  },
  subText: {
    fontSize: 16,
    color: colors.muted
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rowBetween: {
    justifyContent: 'space-between'
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: '#fff'
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: '#EAF1FF'
  },
  pillText: {
    fontSize: 16,
    color: colors.text
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  checkboxPressed: {
    opacity: 0.8
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkboxMark: {
    color: '#fff',
    fontWeight: '700'
  },
  checkboxLabel: {
    fontSize: 18,
    color: colors.text
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text
  },
  modalBody: {
    gap: 8
  },
  modalFooter: {
    alignSelf: 'flex-end'
  }
});
