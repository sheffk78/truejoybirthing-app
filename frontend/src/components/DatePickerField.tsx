import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from './Icon';
import Button from './Button';
import { SIZES, FONTS } from '../constants/theme';
import { useColors, createThemedStyles } from '../hooks/useThemedStyles';
import { formatDateLocal, formatDatetimeLocal } from '../utils/date';

interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'datetime';
  displayFormat?: (date: Date) => string;
  required?: boolean;
  testID?: string;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  mode = 'date',
  displayFormat,
  required = false,
  testID,
}: DatePickerFieldProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [showPicker, setShowPicker] = useState(false);

  const defaultFormatDate = (date: Date) => {
    if (mode === 'datetime') {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDate = displayFormat || defaultFormatDate;

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }
      return;
    }
    // iOS: update immediately (spinner mode, user taps Done when finished)
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const displayValue = value ? formatDate(value) : placeholder;

  return (
    <View style={styles.container} testID={testID}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label || 'Select date'}
      >
        <Icon name="calendar" size={20} color={colors.primary} />
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {displayValue}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Platform-specific date picker rendering */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode === 'datetime' ? 'date' : mode}
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleDateChange}
        />
      )}

      {showPicker && Platform.OS !== 'android' && (
        Platform.OS === 'web' ? (
          <Modal
            visible={showPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label || 'Select Date'}</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Icon name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.webInputWrapper}>
                  <input
                    type={mode === 'datetime' ? 'datetime-local' : 'date'}
                    value={value ? (
                      mode === 'datetime'
                        ? formatDatetimeLocal(value)
                        : formatDateLocal(value)
                    ) : ''}
                    min={minimumDate ? formatDateLocal(minimumDate) : undefined}
                    max={maximumDate ? formatDateLocal(maximumDate) : undefined}
                    onChange={(e: any) => {
                      if (e.target.value) {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                          onChange(newDate);
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 16,
                      fontSize: 18,
                      border: `2px solid ${colors.primary}`,
                      borderRadius: 12,
                      outline: 'none',
                      cursor: 'pointer',
                      backgroundColor: colors.surface,
                      color: colors.text,
                    }}
                  />
                </View>
                <Button
                  title="Done"
                  onPress={() => setShowPicker(false)}
                  fullWidth
                  style={{ marginTop: 16 }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          // iOS native: use modal with spinner for proper rendering
          <Modal
            visible={showPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.iosModalContent}>
                <View style={styles.iosModalHeader}>
                  <Text style={styles.modalTitle}>{label || 'Select Date'}</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Icon name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.iosPickerWrapper}>
                  <DateTimePicker
                    value={value || new Date()}
                    mode={mode === 'datetime' ? 'date' : mode}
                    display="spinner"
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    onChange={handleDateChange}
                    style={{ width: '100%', height: 200 }}
                  />
                </View>
                <Button
                  title="Done"
                  onPress={() => setShowPicker(false)}
                  fullWidth
                  style={{ marginTop: 12 }}
                />
              </View>
            </View>
          </Modal>
        )
      )}
    </View>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.textSecondary,
    marginBottom: SIZES.xs,
  },
  required: {
    color: colors.error,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    minHeight: 52,
  },
  dateText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    marginLeft: SIZES.sm,
  },
  placeholderText: {
    color: colors.textLight,
  },
  // iOS Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    width: '100%',
    maxWidth: 400,
  },
  iosModalContent: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  iosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  iosPickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webInputWrapper: {
    marginVertical: SIZES.md,
  },
}));