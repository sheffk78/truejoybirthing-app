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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

export default function MidwifeVisitsScreen() {
  const params = useLocalSearchParams<{ clientId?: string; clientName?: string }>();
  const [visits, setVisits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientFilter, setClientFilter] = useState<string | null>(params.clientId || null);
  const [showInactive, setShowInactive] = useState(false);
  
  const [selectedClientId, setSelectedClientId] = useState(params.clientId || '');
  const [visitDate, setVisitDate] = useState('');
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
    setVisitDate('');
    setVisitType('Prenatal');
    setGestationalAge('');
    setBloodPressure('');
    setWeight('');
    setFetalHeartRate('');
    setNote('');
  };
  
  const handleCreateVisit = async () => {
    if (!selectedClientId || !visitDate) {
      Alert.alert('Error', 'Please select a client and enter a visit date');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.MIDWIFE_VISITS, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          visit_date: visitDate,
          visit_type: visitType,
          gestational_age: gestationalAge || null,
          blood_pressure: bloodPressure || null,
          weight: weight || null,
          fetal_heart_rate: fetalHeartRate || null,
          note: note || null,
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleMidwife} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Visits</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
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
                    { backgroundColor: visit.visit_type === 'Prenatal' ? COLORS.roleMidwife + '20' : COLORS.accent + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: visit.visit_type === 'Prenatal' ? COLORS.roleMidwife : COLORS.accent },
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
              <Icon name="close" size={24} color={COLORS.textPrimary} />
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
            
            <Input
              label="Visit Date *"
              placeholder="YYYY-MM-DD"
              value={visitDate}
              onChangeText={setVisitDate}
              leftIcon="calendar-outline"
            />
            
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleMidwife,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  visitDate: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
    borderTopColor: COLORS.border,
  },
  vitalItem: {
    marginRight: SIZES.lg,
    marginBottom: SIZES.xs,
  },
  vitalLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  vitalValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  noteText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
  },
  clientOptionSelected: {
    backgroundColor: COLORS.roleMidwife,
    borderColor: COLORS.roleMidwife,
  },
  clientOptionText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  clientOptionTextSelected: {
    color: COLORS.white,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.roleMidwife,
    borderColor: COLORS.roleMidwife,
  },
  typeOptionText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  typeOptionTextSelected: {
    color: COLORS.white,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
