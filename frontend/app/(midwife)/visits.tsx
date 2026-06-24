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
import { formatDateLocal } from '../../src/utils/date';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

export default function MidwifeVisitsScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const params = useLocalSearchParams<{ clientId?: string; clientName?: string }>();
  const [visits, setVisits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientFilter, setClientFilter] = useState<string | null>(params.clientId || null);
  const [showInactive, setShowInactive] = useState(false);
  
  const [selectedClientId, setSelectedClientId] = useState(params.clientId || '');
  const [visitDateObj, setVisitDateObj] = useState<Date | null>(null);
  const [showVisitDatePicker, setShowVisitDatePicker] = useState(false);
  const [visitType, setVisitType] = useState('Prenatal');
  const [gestationalAge, setGestationalAge] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [weight, setWeight] = useState('');
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [note, setNote] = useState('');
  
  const fetchData = async () => {
    try {
      // Use unified endpoints with active client filtering
      const clientsEndpoint = `/provider/clients?include_inactive=${showInactive}`;
      const visitsEndpoint = clientFilter 
        ? `/provider/visits?client_id=${clientFilter}&include_inactive_clients=${showInactive}`
        : `/provider/visits?include_inactive_clients=${showInactive}`;
      
      const [visitsData, clientsData] = await Promise.all([
        apiRequest(visitsEndpoint),
        apiRequest(clientsEndpoint),
      ]);
      setVisits(visitsData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [clientFilter, showInactive]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setSelectedClientId('');
    setVisitDateObj(null);
    setVisitType('Prenatal');
    setGestationalAge('');
    setBloodPressure('');
    setWeight('');
    setFetalHeartRate('');
    setNote('');
  };
  
  const handleCreateVisit = async () => {
    if (!selectedClientId || !visitDateObj) {
      Alert.alert('Error', 'Please select a client and pick a visit date');
      return;
    }
    
    const visitDate = formatDateLocal(visitDateObj);
    setSaving(true);
    try {
      // Use unified endpoint which auto-creates linked appointment
      await apiRequest('/provider/visits', {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          visit_date: visitDate,
          visit_type: visitType,
          gestational_age: gestationalAge || null,
          blood_pressure: bloodPressure || null,
          weight: weight ? parseFloat(weight) : null,
          fetal_heart_rate: fetalHeartRate ? parseInt(fetalHeartRate) : null,
          general_notes: note || null,
        },
      });
      
      await fetchData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Visit recorded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record visit');
    } finally {
      setSaving(false);
    }
  };
  
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.client_id === clientId);
    return client?.name || 'Unknown';
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.roleMidwife} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Visits</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Client Filter */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !clientFilter && styles.filterChipActive]}
              onPress={() => setClientFilter(null)}
            >
              <Text style={[styles.filterChipText, !clientFilter && styles.filterChipTextActive]}>All Clients</Text>
            </TouchableOpacity>
            {clients.filter(c => c.is_active !== false).map((client) => (
              <TouchableOpacity
                key={client.client_id}
                style={[styles.filterChip, clientFilter === client.client_id && styles.filterChipActive]}
                onPress={() => setClientFilter(client.client_id)}
              >
                <Text style={[styles.filterChipText, clientFilter === client.client_id && styles.filterChipTextActive]}>
                  {client.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {visits.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No visits recorded yet. Add a visit to get started.
            </Text>
          </Card>
        ) : (
          visits.map((visit) => (
            <Card key={visit.visit_id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={styles.visitInfo}>
                  <Text style={styles.clientName}>{getClientName(visit.client_id)}</Text>
                  <Text style={styles.visitDate}>{visit.visit_date}</Text>
                </View>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: visit.visit_type === 'Prenatal' ? colors.roleMidwife + '20' : colors.accent + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: visit.visit_type === 'Prenatal' ? colors.roleMidwife : colors.accent },
                    ]}
                  >
                    {visit.visit_type}
                  </Text>
                </View>
              </View>
              
              {(visit.gestational_age || visit.blood_pressure || visit.weight || visit.fetal_heart_rate) && (
                <View style={styles.vitalsRow}>
                  {visit.gestational_age && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>GA</Text>
                      <Text style={styles.vitalValue}>{visit.gestational_age}</Text>
                    </View>
                  )}
                  {visit.blood_pressure && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>BP</Text>
                      <Text style={styles.vitalValue}>{visit.blood_pressure}</Text>
                    </View>
                  )}
                  {visit.weight && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>Weight</Text>
                      <Text style={styles.vitalValue}>{visit.weight}</Text>
                    </View>
                  )}
                  {visit.fetal_heart_rate && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>FHR</Text>
                      <Text style={styles.vitalValue}>{visit.fetal_heart_rate}</Text>
                    </View>
                  )}
                </View>
              )}
              
              {visit.note && (
                <Text style={styles.noteText}>{visit.note}</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Record Visit</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
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
            
            <Text style={styles.fieldLabel}>Visit Type *</Text>
            <View style={styles.typeSelector}>
              {['Prenatal', 'Postpartum'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    visitType === type && styles.typeOptionSelected,
                  ]}
                  onPress={() => setVisitType(type)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      visitType === type && styles.typeOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Visit Date Picker */}
            <Text style={styles.fieldLabel}>Visit Date *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowVisitDatePicker(true)}
              activeOpacity={0.7}
              data-testid="visit-date-picker-btn"
            >
              <Icon name="calendar" size={20} color={colors.roleMidwife} />
              <Text style={[styles.datePickerText, !visitDateObj && styles.datePickerPlaceholder]}>
                {visitDateObj 
                  ? visitDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Select visit date'}
              </Text>
              <Icon name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {showVisitDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={visitDateObj || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowVisitDatePicker(false);
                  if (event.type === 'set' && date) setVisitDateObj(date);
                }}
              />
            )}
            {showVisitDatePicker && Platform.OS !== 'android' && (
              Platform.OS === 'web' ? (
                <View style={styles.webDatePickerContainer}>
                  <input
                    type="date"
                    value={visitDateObj ? formatDateLocal(visitDateObj) : ''}
                    onChange={(e: any) => {
                      if (e.target.value) {
                        setVisitDateObj(new Date(e.target.value + 'T12:00:00'));
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
                  <Button title="Done" onPress={() => setShowVisitDatePicker(false)} fullWidth style={{ marginTop: 8 }} />
                </View>
              ) : (
                <Modal
                  visible={showVisitDatePicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowVisitDatePicker(false)}
                >
                  <View style={styles.dateModalOverlay}>
                    <View style={styles.dateModalContent}>
                      <View style={styles.dateModalHeader}>
                        <Text style={styles.dateModalTitle}>Select Visit Date</Text>
                        <TouchableOpacity onPress={() => setShowVisitDatePicker(false)}>
                          <Icon name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={visitDateObj || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) => { if (date) setVisitDateObj(date); }}
                        style={{ width: '100%', height: 200 }}
                      />
                      <Button title="Done" onPress={() => setShowVisitDatePicker(false)} fullWidth style={{ marginTop: 12 }} />
                    </View>
                  </View>
                </Modal>
              )
            )}
            
            <Input
              label="Gestational Age"
              placeholder="e.g., 28 weeks"
              value={gestationalAge}
              onChangeText={setGestationalAge}
            />
            
            <View style={styles.vitalsGrid}>
              <Input
                label="Blood Pressure"
                placeholder="e.g., 120/80"
                value={bloodPressure}
                onChangeText={setBloodPressure}
                containerStyle={styles.vitalInput}
              />
              <Input
                label="Weight"
                placeholder="e.g., 145 lbs"
                value={weight}
                onChangeText={setWeight}
                containerStyle={styles.vitalInput}
              />
            </View>
            
            <Input
              label="Fetal Heart Rate"
              placeholder="e.g., 145 bpm"
              value={fetalHeartRate}
              onChangeText={setFetalHeartRate}
            />
            
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Visit notes..."
              multiline
              numberOfLines={4}
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Record Visit"
              onPress={handleCreateVisit}
              loading={saving}
              fullWidth
            />
          </View>
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
    fontFamily: FONTS.heading,
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
  emptyText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  visitCard: {
    marginBottom: SIZES.sm,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  visitInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
    marginBottom: 2,
  },
  visitDate: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  typeBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  typeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  vitalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vitalItem: {
    marginRight: SIZES.lg,
    marginBottom: SIZES.xs,
  },
  vitalLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
  },
  vitalValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
  },
  noteText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.sm,
    fontStyle: 'italic',
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
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
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
    fontFamily: FONTS.body,
    color: colors.text,
  },
  clientOptionTextSelected: {
    color: colors.white,
    fontFamily: FONTS.bodyBold,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
  },
  typeOption: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  typeOptionSelected: {
    backgroundColor: colors.roleMidwife,
    borderColor: colors.roleMidwife,
  },
  typeOptionText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  typeOptionTextSelected: {
    color: colors.white,
    fontFamily: FONTS.bodyBold,
  },
  vitalsGrid: {
    flexDirection: 'row',
  },
  vitalInput: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterContainer: {
    marginBottom: SIZES.md,
  },
  filterChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusMd,
    marginRight: SIZES.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.roleMidwife,
    borderColor: colors.roleMidwife,
  },
  filterChipText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontFamily: FONTS.bodyBold,
  },
  // Date Picker styles
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
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
}));
