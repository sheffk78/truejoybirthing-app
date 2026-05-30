import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

const BIRTH_PLACES = ['Home', 'Birth Center', 'Transfer to Hospital'];
const BIRTH_MODES = ['Spontaneous Vaginal', 'Assisted Vaginal', 'Cesarean', 'Other'];

export default function MidwifeBirthSummariesScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingSummary, setViewingSummary] = useState<any>(null);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthTime, setBirthTime] = useState<Date>(new Date());
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showBirthTimePicker, setShowBirthTimePicker] = useState(false);
  const [birthPlace, setBirthPlace] = useState('Home');
  const [modeOfBirth, setModeOfBirth] = useState('Spontaneous Vaginal');
  const [newbornDetails, setNewbornDetails] = useState('');
  const [complications, setComplications] = useState('');
  const [summaryNote, setSummaryNote] = useState('');
  
  const fetchData = async () => {
    try {
      const [summariesData, clientsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.MIDWIFE_BIRTH_SUMMARIES),
        apiRequest(API_ENDPOINTS.MIDWIFE_CLIENTS),
      ]);
      setSummaries(summariesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setSelectedClientId('');
    setBirthDate(null);
    setBirthTime(new Date());
    setBirthPlace('Home');
    setModeOfBirth('Spontaneous Vaginal');
    setNewbornDetails('');
    setComplications('');
    setSummaryNote('');
  };
  
  // Compute the combined birth_datetime string from date + time pickers
  const getBirthDatetimeString = () => {
    if (!birthDate) return '';
    const dateStr = birthDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = `${birthTime.getHours().toString().padStart(2, '0')}:${birthTime.getMinutes().toString().padStart(2, '0')}`;
    return `${dateStr} ${timeStr}`;
  };
  
  const handleCreateSummary = async () => {
    const birthDatetime = getBirthDatetimeString();
    if (!selectedClientId || !birthDatetime || !birthPlace || !modeOfBirth) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.MIDWIFE_BIRTH_SUMMARIES, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          birth_datetime: birthDatetime,
          birth_place: birthPlace,
          mode_of_birth: modeOfBirth,
          newborn_details: newbornDetails || null,
          complications: complications || null,
          summary_note: summaryNote || null,
        },
      });
      
      await fetchData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Birth summary created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create birth summary');
    } finally {
      setSaving(false);
    }
  };
  
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.client_id === clientId);
    return client?.name || 'Unknown';
  };
  
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };
  
  const getPlaceColor = (place: string) => {
    switch (place) {
      case 'Home': return colors.success;
      case 'Birth Center': return colors.roleMidwife;
      case 'Transfer to Hospital': return colors.warning;
      default: return colors.textLight;
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid="birth-summaries-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.roleMidwife} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Birth Summaries</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            data-testid="add-summary-btn"
          >
            <Icon name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Summaries List */}
        {summaries.length === 0 ? (
          <Card data-testid="empty-summaries-card">
            <View style={styles.emptyContent}>
              <Icon name="heart" size={48} color={colors.roleMidwife + '40'} />
              <Text style={styles.emptyText}>
                No birth summaries yet.
              </Text>
              <Text style={styles.emptySubtext}>
                Record birth details for your clients here.
              </Text>
            </View>
          </Card>
        ) : (
          summaries.map((summary) => (
            <TouchableOpacity
              key={summary.summary_id}
              activeOpacity={0.8}
              onPress={() => setViewingSummary(summary)}
              data-testid={`summary-card-${summary.summary_id}`}
            >
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.clientName}>{getClientName(summary.client_id)}</Text>
                    <Text style={styles.birthDate}>{formatDateTime(summary.birth_datetime)}</Text>
                  </View>
                  <View
                    style={[
                      styles.placeBadge,
                      { backgroundColor: getPlaceColor(summary.birth_place) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.placeText,
                        { color: getPlaceColor(summary.birth_place) },
                      ]}
                    >
                      {summary.birth_place}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryDetails}>
                  <View style={styles.detailItem}>
                    <Icon name="fitness-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{summary.mode_of_birth}</Text>
                  </View>
                  {summary.newborn_details && (
                    <View style={styles.detailItem}>
                      <Icon name="happy-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {summary.newborn_details}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.viewMore}>
                  <Text style={styles.viewMoreText}>Tap to view details</Text>
                  <Icon name="chevron-forward" size={16} color={colors.textLight} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Create Summary Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} data-testid="close-modal-btn">
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Birth Summary</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Client Selector */}
            <Text style={styles.fieldLabel}>Select Client *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSelector}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.client_id}
                  style={[
                    styles.clientOption,
                    selectedClientId === client.client_id && styles.clientOptionSelected,
                  ]}
                  onPress={() => setSelectedClientId(client.client_id)}
                  data-testid={`select-client-${client.client_id}`}
                >
                  <Text
                    style={[
                      styles.clientOptionText,
                      selectedClientId === client.client_id && styles.clientOptionTextSelected,
                    ]}
                  >
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Birth Date Picker */}
            <Text style={styles.fieldLabel}>Birth Date *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowBirthDatePicker(true)}
              activeOpacity={0.7}
              data-testid="birth-date-picker-btn"
            >
              <Icon name="calendar" size={20} color={colors.roleMidwife} />
              <Text style={[styles.datePickerText, !birthDate && styles.datePickerPlaceholder]}>
                {birthDate 
                  ? birthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Select birth date'}
              </Text>
              <Icon name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {showBirthDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={birthDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowBirthDatePicker(false);
                  if (event.type === 'set' && date) setBirthDate(date);
                }}
              />
            )}
            {showBirthDatePicker && Platform.OS !== 'android' && (
              Platform.OS === 'web' ? (
                <View style={styles.webDatePickerContainer}>
                  <input
                    type="date"
                    value={birthDate ? birthDate.toISOString().split('T')[0] : ''}
                    onChange={(e: any) => {
                      if (e.target.value) {
                        setBirthDate(new Date(e.target.value + 'T12:00:00'));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 16,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    }}
                  />
                  <Button title="Done" onPress={() => setShowBirthDatePicker(false)} fullWidth style={{ marginTop: 8 }} />
                </View>
              ) : (
                <Modal
                  visible={showBirthDatePicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowBirthDatePicker(false)}
                >
                  <View style={styles.dateModalOverlay}>
                    <View style={styles.dateModalContent}>
                      <View style={styles.dateModalHeader}>
                        <Text style={styles.dateModalTitle}>Select Birth Date</Text>
                        <TouchableOpacity onPress={() => setShowBirthDatePicker(false)}>
                          <Icon name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={birthDate || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) => { if (date) setBirthDate(date); }}
                        style={{ width: '100%', height: 200 }}
                      />
                      <Button title="Done" onPress={() => setShowBirthDatePicker(false)} fullWidth style={{ marginTop: 12 }} />
                    </View>
                  </View>
                </Modal>
              )
            )}

            {/* Birth Time Picker */}
            <Text style={styles.fieldLabel}>Birth Time *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowBirthTimePicker(true)}
              activeOpacity={0.7}
              data-testid="birth-time-picker-btn"
            >
              <Icon name="time" size={20} color={colors.roleMidwife} />
              <Text style={styles.datePickerText}>
                {birthTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
              <Icon name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {showBirthTimePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={birthTime}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowBirthTimePicker(false);
                  if (event.type === 'set' && date) setBirthTime(date);
                }}
              />
            )}
            {showBirthTimePicker && Platform.OS !== 'android' && (
              Platform.OS === 'web' ? (
                <View style={styles.webDatePickerContainer}>
                  <input
                    type="time"
                    value={`${birthTime.getHours().toString().padStart(2, '0')}:${birthTime.getMinutes().toString().padStart(2, '0')}`}
                    onChange={(e: any) => {
                      if (e.target.value) {
                        const [hours, minutes] = e.target.value.split(':');
                        const newTime = new Date(birthTime);
                        newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                        setBirthTime(newTime);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 16,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    }}
                  />
                  <Button title="Done" onPress={() => setShowBirthTimePicker(false)} fullWidth style={{ marginTop: 8 }} />
                </View>
              ) : (
                <Modal
                  visible={showBirthTimePicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowBirthTimePicker(false)}
                >
                  <View style={styles.dateModalOverlay}>
                    <View style={styles.dateModalContent}>
                      <View style={styles.dateModalHeader}>
                        <Text style={styles.dateModalTitle}>Select Birth Time</Text>
                        <TouchableOpacity onPress={() => setShowBirthTimePicker(false)}>
                          <Icon name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={birthTime}
                        mode="time"
                        display="spinner"
                        onChange={(event, date) => { if (date) setBirthTime(date); }}
                        style={{ width: '100%', height: 200 }}
                      />
                      <Button title="Done" onPress={() => setShowBirthTimePicker(false)} fullWidth style={{ marginTop: 12 }} />
                    </View>
                  </View>
                </Modal>
              )
            )}
            
            {/* Birth Place Selector */}
            <Text style={styles.fieldLabel}>Birth Place *</Text>
            <View style={styles.optionGrid}>
              {BIRTH_PLACES.map((place) => (
                <TouchableOpacity
                  key={place}
                  style={[
                    styles.optionButton,
                    birthPlace === place && styles.optionButtonSelected,
                  ]}
                  onPress={() => setBirthPlace(place)}
                  data-testid={`place-${place.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      birthPlace === place && styles.optionButtonTextSelected,
                    ]}
                  >
                    {place}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Mode of Birth Selector */}
            <Text style={styles.fieldLabel}>Mode of Birth *</Text>
            <View style={styles.optionGrid}>
              {BIRTH_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.optionButton,
                    modeOfBirth === mode && styles.optionButtonSelected,
                  ]}
                  onPress={() => setModeOfBirth(mode)}
                  data-testid={`mode-${mode.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      modeOfBirth === mode && styles.optionButtonTextSelected,
                    ]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.fieldLabel}>Newborn Details</Text>
            <TextInput
              style={styles.textInput}
              value={newbornDetails}
              onChangeText={setNewbornDetails}
              placeholder="e.g., 7 lbs 8 oz, APGARs 9/9, Female"
              placeholderTextColor={colors.textLight}
              data-testid="newborn-details-input"
            />
            
            <Text style={styles.fieldLabel}>Complications (if any)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={complications}
              onChangeText={setComplications}
              placeholder="Document any complications during birth..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              data-testid="complications-input"
            />
            
            <Text style={styles.fieldLabel}>Summary Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaLarge]}
              value={summaryNote}
              onChangeText={setSummaryNote}
              placeholder="Additional notes about the birth..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              data-testid="summary-note-input"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Create Birth Summary"
              onPress={handleCreateSummary}
              loading={saving}
              fullWidth
              testID="submit-summary-btn"
            />
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* View Summary Modal */}
      <Modal
        visible={!!viewingSummary}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingSummary(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setViewingSummary(null)} data-testid="close-view-modal">
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Birth Summary</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {viewingSummary && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.viewSection}>
                <Text style={styles.viewLabel}>Client</Text>
                <Text style={styles.viewValue}>{getClientName(viewingSummary.client_id)}</Text>
              </View>
              
              <View style={styles.viewSection}>
                <Text style={styles.viewLabel}>Birth Date & Time</Text>
                <Text style={styles.viewValue}>{formatDateTime(viewingSummary.birth_datetime)}</Text>
              </View>
              
              <View style={styles.viewRow}>
                <View style={[styles.viewSection, { flex: 1 }]}>
                  <Text style={styles.viewLabel}>Birth Place</Text>
                  <View
                    style={[
                      styles.viewBadge,
                      { backgroundColor: getPlaceColor(viewingSummary.birth_place) + '20' },
                    ]}
                  >
                    <Text style={[styles.viewBadgeText, { color: getPlaceColor(viewingSummary.birth_place) }]}>
                      {viewingSummary.birth_place}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.viewSection, { flex: 1 }]}>
                  <Text style={styles.viewLabel}>Mode of Birth</Text>
                  <Text style={styles.viewValue}>{viewingSummary.mode_of_birth}</Text>
                </View>
              </View>
              
              {viewingSummary.newborn_details && (
                <View style={styles.viewSection}>
                  <Text style={styles.viewLabel}>Newborn Details</Text>
                  <Text style={styles.viewValue}>{viewingSummary.newborn_details}</Text>
                </View>
              )}
              
              {viewingSummary.complications && (
                <View style={styles.viewSection}>
                  <Text style={styles.viewLabel}>Complications</Text>
                  <Card style={styles.complicationCard}>
                    <Text style={styles.complicationText}>{viewingSummary.complications}</Text>
                  </Card>
                </View>
              )}
              
              {viewingSummary.summary_note && (
                <View style={styles.viewSection}>
                  <Text style={styles.viewLabel}>Summary Notes</Text>
                  <Text style={styles.viewValue}>{viewingSummary.summary_note}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.roleMidwife,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: SIZES.lg,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: colors.text,
    fontWeight: '600',
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
  },
  summaryCard: {
    marginBottom: SIZES.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  summaryInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  birthDate: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
  },
  placeBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  placeText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  summaryDetails: {
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SIZES.sm,
  },
  viewMoreText: {
    fontSize: SIZES.fontSm,
    color: colors.textLight,
    marginRight: SIZES.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  clientSelector: {
    marginBottom: SIZES.md,
  },
  clientOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: SIZES.sm,
  },
  clientOptionSelected: {
    backgroundColor: colors.roleMidwife,
    borderColor: colors.roleMidwife,
  },
  clientOptionText: {
    fontSize: SIZES.fontSm,
    color: colors.text,
  },
  clientOptionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.md,
  },
  optionButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  optionButtonSelected: {
    backgroundColor: colors.roleMidwife,
    borderColor: colors.roleMidwife,
  },
  optionButtonText: {
    fontSize: SIZES.fontSm,
    color: colors.text,
  },
  optionButtonTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: colors.text,
    marginBottom: SIZES.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  viewSection: {
    marginBottom: SIZES.lg,
  },
  viewLabel: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
    marginBottom: SIZES.xs,
  },
  viewValue: {
    fontSize: SIZES.fontMd,
    color: colors.text,
    fontWeight: '500',
  },
  viewRow: {
    flexDirection: 'row',
  },
  viewBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  viewBadgeText: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
  },
  complicationCard: {
    backgroundColor: colors.warning + '15',
  },
  complicationText: {
    fontSize: SIZES.fontMd,
    color: colors.text,
  },
  // Date/Time Picker styles
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    minHeight: 52,
    marginBottom: SIZES.sm,
  },
  datePickerText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: colors.text,
    marginLeft: SIZES.sm,
  },
  datePickerPlaceholder: {
    color: colors.textLight,
  },
  webDatePickerContainer: {
    marginVertical: SIZES.sm,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusMd,
    overflow: 'visible',
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  dateModalContent: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    width: '100%',
    maxWidth: 400,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  dateModalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
  },
}));
