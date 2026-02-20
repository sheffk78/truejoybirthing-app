/**
 * Midwife Client Detail Screen - Prenatal Visit Management
 * 
 * This is a SPECIALIZED screen for midwife workflow, distinct from the shared
 * ProviderClientDetail hub component. Key differences:
 * 
 * - Purpose: Clinical prenatal visit tracking with vitals, urinalysis, wellness scores
 * - Workflow: Direct data entry for each visit
 * - Not a "hub" but a focused clinical documentation tool
 * 
 * The shared ProviderClientDetail.tsx serves as a general client hub with
 * timeline, counts, and quick actions - a different use case.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

const URINALYSIS_OPTIONS = ['Normal', 'Protein +', 'Protein ++', 'Glucose +', 'Glucose ++', 'Protein & Glucose +', 'Other'];

const WELLBEING_SCALE = [
  { value: 1, label: '1 - Struggling' },
  { value: 2, label: '2 - Challenging' },
  { value: 3, label: '3 - Okay' },
  { value: 4, label: '4 - Good' },
  { value: 5, label: '5 - Great' },
];

interface PrenatalVisit {
  prenatal_visit_id: string;
  client_id: string;
  visit_date: string;
  summary: string;
  urinalysis?: string;
  urinalysis_note?: string;
  blood_pressure?: string;
  fetal_heart_rate?: number;
  fundal_height?: number;
  weight?: number;
  weight_unit?: string;
  eating_score?: number;
  eating_note?: string;
  water_score?: number;
  water_note?: string;
  emotional_score?: number;
  emotional_note?: string;
  physical_score?: number;
  physical_note?: string;
  mental_score?: number;
  mental_note?: string;
  spiritual_score?: number;
  spiritual_note?: string;
  general_notes?: string;
  created_at: string;
}

interface Client {
  client_id: string;
  name: string;
  email?: string;
  edd?: string;
  status: string;
  planned_birth_setting?: string;
}

export default function MidwifeClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const clientId = params.clientId as string;
  const clientName = params.clientName as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [prenatalVisits, setPrenatalVisits] = useState<PrenatalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<PrenatalVisit | null>(null);
  const [saving, setSaving] = useState(false);
  const [showVisitDetail, setShowVisitDetail] = useState<PrenatalVisit | null>(null);
  
  // Form state
  const [visitDate, setVisitDate] = useState('');
  const [urinalysis, setUrinalysis] = useState('');
  const [urinalysisNote, setUrinalysisNote] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [fundalHeight, setFundalHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');
  const [eatingScore, setEatingScore] = useState<number | null>(null);
  const [eatingNote, setEatingNote] = useState('');
  const [waterScore, setWaterScore] = useState<number | null>(null);
  const [waterNote, setWaterNote] = useState('');
  const [emotionalScore, setEmotionalScore] = useState<number | null>(null);
  const [emotionalNote, setEmotionalNote] = useState('');
  const [physicalScore, setPhysicalScore] = useState<number | null>(null);
  const [physicalNote, setPhysicalNote] = useState('');
  const [mentalScore, setMentalScore] = useState<number | null>(null);
  const [mentalNote, setMentalNote] = useState('');
  const [spiritualScore, setSpiritualScore] = useState<number | null>(null);
  const [spiritualNote, setSpiritualNote] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  
  const fetchData = async () => {
    try {
      // Fetch client details
      const clientData = await apiRequest(`${API_ENDPOINTS.MIDWIFE_CLIENTS}/${clientId}`);
      setClient(clientData);
      
      // Fetch prenatal visits
      const visitsData = await apiRequest(`/midwife/clients/${clientId}/prenatal-visits`);
      setPrenatalVisits(visitsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };
  
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setVisitDate(today);
    setUrinalysis('');
    setUrinalysisNote('');
    setBloodPressure('');
    setFetalHeartRate('');
    setFundalHeight('');
    setWeight('');
    setWeightUnit('lbs');
    setEatingScore(null);
    setEatingNote('');
    setWaterScore(null);
    setWaterNote('');
    setEmotionalScore(null);
    setEmotionalNote('');
    setPhysicalScore(null);
    setPhysicalNote('');
    setMentalScore(null);
    setMentalNote('');
    setSpiritualScore(null);
    setSpiritualNote('');
    setGeneralNotes('');
    setEditingVisit(null);
  };
  
  const openAddVisit = () => {
    resetForm();
    setShowVisitModal(true);
  };
  
  const openEditVisit = (visit: PrenatalVisit) => {
    setEditingVisit(visit);
    setVisitDate(visit.visit_date);
    setUrinalysis(visit.urinalysis || '');
    setUrinalysisNote(visit.urinalysis_note || '');
    setBloodPressure(visit.blood_pressure || '');
    setFetalHeartRate(visit.fetal_heart_rate?.toString() || '');
    setFundalHeight(visit.fundal_height?.toString() || '');
    setWeight(visit.weight?.toString() || '');
    setWeightUnit(visit.weight_unit || 'lbs');
    setEatingScore(visit.eating_score || null);
    setEatingNote(visit.eating_note || '');
    setWaterScore(visit.water_score || null);
    setWaterNote(visit.water_note || '');
    setEmotionalScore(visit.emotional_score || null);
    setEmotionalNote(visit.emotional_note || '');
    setPhysicalScore(visit.physical_score || null);
    setPhysicalNote(visit.physical_note || '');
    setMentalScore(visit.mental_score || null);
    setMentalNote(visit.mental_note || '');
    setSpiritualScore(visit.spiritual_score || null);
    setSpiritualNote(visit.spiritual_note || '');
    setGeneralNotes(visit.general_notes || '');
    setShowVisitDetail(null);
    setShowVisitModal(true);
  };
  
  const handleSaveVisit = async () => {
    if (!visitDate) {
      Alert.alert('Error', 'Please select a visit date');
      return;
    }
    
    setSaving(true);
    try {
      const visitData = {
        client_id: clientId,
        visit_date: visitDate,
        urinalysis: urinalysis || undefined,
        urinalysis_note: urinalysisNote || undefined,
        blood_pressure: bloodPressure || undefined,
        fetal_heart_rate: fetalHeartRate ? parseInt(fetalHeartRate) : undefined,
        fundal_height: fundalHeight ? parseFloat(fundalHeight) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        weight_unit: weightUnit,
        eating_score: eatingScore || undefined,
        eating_note: eatingNote || undefined,
        water_score: waterScore || undefined,
        water_note: waterNote || undefined,
        emotional_score: emotionalScore || undefined,
        emotional_note: emotionalNote || undefined,
        physical_score: physicalScore || undefined,
        physical_note: physicalNote || undefined,
        mental_score: mentalScore || undefined,
        mental_note: mentalNote || undefined,
        spiritual_score: spiritualScore || undefined,
        spiritual_note: spiritualNote || undefined,
        general_notes: generalNotes || undefined,
      };
      
      if (editingVisit) {
        await apiRequest(`/midwife/clients/${clientId}/prenatal-visits/${editingVisit.prenatal_visit_id}`, {
          method: 'PUT',
          body: visitData,
        });
        Alert.alert('Success', 'Prenatal visit updated');
      } else {
        await apiRequest(`/midwife/clients/${clientId}/prenatal-visits`, {
          method: 'POST',
          body: visitData,
        });
        Alert.alert('Success', 'Prenatal visit saved');
      }
      
      setShowVisitModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save prenatal visit');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteVisit = (visit: PrenatalVisit) => {
    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this prenatal visit record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/midwife/clients/${clientId}/prenatal-visits/${visit.prenatal_visit_id}`, {
                method: 'DELETE',
              });
              setShowVisitDetail(null);
              fetchData();
              Alert.alert('Deleted', 'Prenatal visit record deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete visit');
            }
          },
        },
      ]
    );
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const renderScoreSelector = (
    label: string,
    value: number | null,
    onChange: (val: number | null) => void,
    note: string,
    onNoteChange: (val: string) => void
  ) => (
    <View style={styles.wellbeingItem}>
      <Text style={styles.wellbeingLabel}>{label}</Text>
      <View style={styles.scoreRow}>
        {WELLBEING_SCALE.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.scoreButton,
              value === item.value && styles.scoreButtonSelected,
            ]}
            onPress={() => onChange(value === item.value ? null : item.value)}
          >
            <Text
              style={[
                styles.scoreButtonText,
                value === item.value && styles.scoreButtonTextSelected,
              ]}
            >
              {item.value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="Optional note..."
        placeholderTextColor={COLORS.textLight}
        value={note}
        onChangeText={onNoteChange}
      />
    </View>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.roleMidwife} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbHeader}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={() => router.replace('/(midwife)/clients' as any)}
            style={styles.breadcrumbItem}
          >
            <Text style={styles.breadcrumbLink}>Clients</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <Text style={styles.breadcrumbCurrent}>{client?.name || clientName}</Text>
        </View>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleMidwife} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Client Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{(client?.name || clientName || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{client?.name || clientName}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: COLORS.roleMidwife + '20' }]}>
                  <Text style={[styles.statusText, { color: COLORS.roleMidwife }]}>{client?.status || 'Active'}</Text>
                </View>
                {client?.edd && (
                  <Text style={styles.eddText}>EDD: {formatDate(client.edd)}</Text>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Icon name="mail-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{client?.email || 'No email'}</Text>
            </View>
            {client?.planned_birth_setting && (
              <View style={styles.detailRow}>
                <Icon name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{client.planned_birth_setting}</Text>
              </View>
            )}
          </View>
        </Card>
        
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/(midwife)/contracts', params: { clientId, clientName: client?.name || clientName } } as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleMidwife + '15' }]}>
              <Icon name="document-text-outline" size={20} color={COLORS.roleMidwife} />
            </View>
            <Text style={styles.actionLabel}>Contract</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/(midwife)/invoices', params: { clientId, clientName: client?.name || clientName } } as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Icon name="cash-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.actionLabel}>Invoice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/(midwife)/appointments', params: { clientId, clientName: client?.name || clientName } } as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Icon name="calendar-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/(midwife)/notes', params: { clientId, clientName: client?.name || clientName } } as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Icon name="create-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>Notes</Text>
          </TouchableOpacity>
        </View>
        
        {/* Prenatal Visits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="clipboard-outline" size={22} color={COLORS.roleMidwife} />
              <Text style={styles.sectionTitle}>Prenatal Visits</Text>
              <Text style={styles.visitCount}>({prenatalVisits.length})</Text>
            </View>
            <TouchableOpacity
              style={styles.addVisitButton}
              onPress={openAddVisit}
              data-testid="add-prenatal-visit-btn"
            >
              <Icon name="add" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          {prenatalVisits.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon name="document-text-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No prenatal visits yet</Text>
              <Text style={styles.emptyText}>
                Tap the + button above to record your first prenatal visit assessment.
              </Text>
            </Card>
          ) : (
            prenatalVisits.map((visit) => (
              <TouchableOpacity
                key={visit.prenatal_visit_id}
                activeOpacity={0.8}
                onPress={() => setShowVisitDetail(visit)}
              >
                <Card style={styles.visitCard}>
                  <View style={styles.visitHeader}>
                    <View style={styles.visitDateBadge}>
                      <Icon name="calendar-outline" size={14} color={COLORS.roleMidwife} />
                      <Text style={styles.visitDateText}>{formatDate(visit.visit_date)}</Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={COLORS.textLight} />
                  </View>
                  <Text style={styles.visitSummary}>{visit.summary}</Text>
                  
                  {/* Quick vitals preview */}
                  {(visit.blood_pressure || visit.fetal_heart_rate || visit.fundal_height) && (
                    <View style={styles.vitalsPreview}>
                      {visit.blood_pressure && (
                        <View style={styles.vitalChip}>
                          <Text style={styles.vitalLabel}>BP</Text>
                          <Text style={styles.vitalValue}>{visit.blood_pressure}</Text>
                        </View>
                      )}
                      {visit.fetal_heart_rate && (
                        <View style={styles.vitalChip}>
                          <Text style={styles.vitalLabel}>FHR</Text>
                          <Text style={styles.vitalValue}>{visit.fetal_heart_rate}</Text>
                        </View>
                      )}
                      {visit.fundal_height && (
                        <View style={styles.vitalChip}>
                          <Text style={styles.vitalLabel}>FH</Text>
                          <Text style={styles.vitalValue}>{visit.fundal_height}cm</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      
      {/* Add/Edit Visit Modal */}
      <Modal
        visible={showVisitModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVisitModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVisitModal(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingVisit ? 'Edit Prenatal Visit' : 'Add Prenatal Visit'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Visit Date */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Visit Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  style={{
                    padding: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 10,
                    fontSize: 16,
                    width: '100%',
                    backgroundColor: COLORS.white,
                  }}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textLight}
                  value={visitDate}
                  onChangeText={setVisitDate}
                />
              )}
            </View>
            
            {/* Vitals & Measurements */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Vitals & Measurements</Text>
              
              <Text style={styles.fieldLabel}>Urinalysis</Text>
              <View style={styles.urinalysisRow}>
                {URINALYSIS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.urinalysisOption,
                      urinalysis === option && styles.urinalysisOptionSelected,
                    ]}
                    onPress={() => setUrinalysis(urinalysis === option ? '' : option)}
                  >
                    <Text
                      style={[
                        styles.urinalysisOptionText,
                        urinalysis === option && styles.urinalysisOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {urinalysis === 'Other' && (
                <TextInput
                  style={styles.input}
                  placeholder="Specify urinalysis result..."
                  placeholderTextColor={COLORS.textLight}
                  value={urinalysisNote}
                  onChangeText={setUrinalysisNote}
                />
              )}
              
              <Text style={styles.fieldLabel}>Blood Pressure</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 120/70"
                placeholderTextColor={COLORS.textLight}
                value={bloodPressure}
                onChangeText={setBloodPressure}
              />
              
              <Text style={styles.fieldLabel}>Fetal Heart Rate (bpm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 140"
                placeholderTextColor={COLORS.textLight}
                value={fetalHeartRate}
                onChangeText={setFetalHeartRate}
                keyboardType="numeric"
              />
              
              <Text style={styles.fieldLabel}>Fundal Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 28"
                placeholderTextColor={COLORS.textLight}
                value={fundalHeight}
                onChangeText={setFundalHeight}
                keyboardType="decimal-pad"
              />
              
              <Text style={styles.fieldLabel}>Weight</Text>
              <View style={styles.weightRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="e.g., 145"
                  placeholderTextColor={COLORS.textLight}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitToggle}>
                  <TouchableOpacity
                    style={[styles.unitOption, weightUnit === 'lbs' && styles.unitOptionSelected]}
                    onPress={() => setWeightUnit('lbs')}
                  >
                    <Text style={[styles.unitText, weightUnit === 'lbs' && styles.unitTextSelected]}>lbs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitOption, weightUnit === 'kg' && styles.unitOptionSelected]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <Text style={[styles.unitText, weightUnit === 'kg' && styles.unitTextSelected]}>kg</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Overall Well-Being */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Overall Well-Being</Text>
              <Text style={styles.formSectionSubtitle}>1 = Struggling, 5 = Feeling great</Text>
              
              {renderScoreSelector('Eating', eatingScore, setEatingScore, eatingNote, setEatingNote)}
              {renderScoreSelector('Water Intake', waterScore, setWaterScore, waterNote, setWaterNote)}
              {renderScoreSelector('Emotional', emotionalScore, setEmotionalScore, emotionalNote, setEmotionalNote)}
              {renderScoreSelector('Physical', physicalScore, setPhysicalScore, physicalNote, setPhysicalNote)}
              {renderScoreSelector('Mental', mentalScore, setMentalScore, mentalNote, setMentalNote)}
              {renderScoreSelector('Spiritual', spiritualScore, setSpiritualScore, spiritualNote, setSpiritualNote)}
            </View>
            
            {/* General Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>General Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional observations or notes..."
                placeholderTextColor={COLORS.textLight}
                value={generalNotes}
                onChangeText={setGeneralNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title={editingVisit ? 'Update Visit' : 'Save Visit'}
              onPress={handleSaveVisit}
              loading={saving}
              fullWidth
            />
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Visit Detail Modal */}
      <Modal
        visible={!!showVisitDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVisitDetail(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVisitDetail(null)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Prenatal Visit</Text>
            <TouchableOpacity onPress={() => showVisitDetail && openEditVisit(showVisitDetail)}>
              <Icon name="create-outline" size={24} color={COLORS.roleMidwife} />
            </TouchableOpacity>
          </View>
          
          {showVisitDetail && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailDateHeader}>
                <Icon name="calendar" size={20} color={COLORS.roleMidwife} />
                <Text style={styles.detailDate}>{formatDate(showVisitDetail.visit_date)}</Text>
              </View>
              
              {/* Vitals Section */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Vitals & Measurements</Text>
                
                {showVisitDetail.urinalysis && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Urinalysis:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.urinalysis}</Text>
                  </View>
                )}
                {showVisitDetail.blood_pressure && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Blood Pressure:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.blood_pressure}</Text>
                  </View>
                )}
                {showVisitDetail.fetal_heart_rate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fetal Heart Rate:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.fetal_heart_rate} bpm</Text>
                  </View>
                )}
                {showVisitDetail.fundal_height && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fundal Height:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.fundal_height} cm</Text>
                  </View>
                )}
                {showVisitDetail.weight && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight:</Text>
                    <Text style={styles.detailValue}>
                      {showVisitDetail.weight} {showVisitDetail.weight_unit || 'lbs'}
                    </Text>
                  </View>
                )}
                {!showVisitDetail.urinalysis && !showVisitDetail.blood_pressure && 
                 !showVisitDetail.fetal_heart_rate && !showVisitDetail.fundal_height && 
                 !showVisitDetail.weight && (
                  <Text style={styles.noDataText}>No vitals recorded</Text>
                )}
              </Card>
              
              {/* Well-Being Section */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Overall Well-Being</Text>
                
                {[
                  { label: 'Eating', score: showVisitDetail.eating_score, note: showVisitDetail.eating_note },
                  { label: 'Water Intake', score: showVisitDetail.water_score, note: showVisitDetail.water_note },
                  { label: 'Emotional', score: showVisitDetail.emotional_score, note: showVisitDetail.emotional_note },
                  { label: 'Physical', score: showVisitDetail.physical_score, note: showVisitDetail.physical_note },
                  { label: 'Mental', score: showVisitDetail.mental_score, note: showVisitDetail.mental_note },
                  { label: 'Spiritual', score: showVisitDetail.spiritual_score, note: showVisitDetail.spiritual_note },
                ].map((item) => item.score && (
                  <View key={item.label} style={styles.wellbeingDetailRow}>
                    <View style={styles.wellbeingDetailHeader}>
                      <Text style={styles.detailLabel}>{item.label}:</Text>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeText}>{item.score}/5</Text>
                      </View>
                    </View>
                    {item.note && <Text style={styles.wellbeingNote}>{item.note}</Text>}
                  </View>
                ))}
                
                {!showVisitDetail.eating_score && !showVisitDetail.water_score && 
                 !showVisitDetail.emotional_score && !showVisitDetail.physical_score && 
                 !showVisitDetail.mental_score && !showVisitDetail.spiritual_score && (
                  <Text style={styles.noDataText}>No well-being data recorded</Text>
                )}
              </Card>
              
              {/* General Notes */}
              {showVisitDetail.general_notes && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>General Notes</Text>
                  <Text style={styles.generalNotesText}>{showVisitDetail.general_notes}</Text>
                </Card>
              )}
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVisit(showVisitDetail)}
              >
                <Icon name="trash-outline" size={18} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>Delete Visit</Text>
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumbHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    paddingVertical: SIZES.xs,
  },
  breadcrumbLink: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.roleMidwife,
  },
  breadcrumbSeparator: {
    marginHorizontal: SIZES.xs,
    fontSize: SIZES.fontMd,
    color: COLORS.textLight,
  },
  breadcrumbCurrent: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  profileCard: {
    marginBottom: SIZES.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.roleMidwife,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  avatarText: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  statusText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  eddText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  profileDetails: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SIZES.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xs,
  },
  actionLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  visitCount: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginLeft: SIZES.xs,
  },
  addVisitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.roleMidwife,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
    paddingHorizontal: SIZES.lg,
  },
  visitCard: {
    marginBottom: SIZES.sm,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  visitDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roleMidwife + '15',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  visitDateText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.roleMidwife,
    marginLeft: 4,
  },
  visitSummary: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  modalFooter: {
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  formSection: {
    marginBottom: SIZES.lg,
  },
  formSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  formSectionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  urinalysisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  urinalysisOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  urinalysisOptionSelected: {
    backgroundColor: COLORS.roleMidwife,
    borderColor: COLORS.roleMidwife,
  },
  urinalysisOptionText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  urinalysisOptionTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyMedium,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
  },
  unitOptionSelected: {
    backgroundColor: COLORS.roleMidwife,
  },
  unitText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  unitTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyMedium,
  },
  wellbeingItem: {
    marginBottom: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wellbeingLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreButtonSelected: {
    backgroundColor: COLORS.roleMidwife,
    borderColor: COLORS.roleMidwife,
  },
  scoreButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  scoreButtonTextSelected: {
    color: COLORS.white,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  detailDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  detailDate: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.roleMidwife,
    marginLeft: SIZES.sm,
  },
  detailCard: {
    marginBottom: SIZES.md,
  },
  detailCardTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.xs,
  },
  detailLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  noDataText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SIZES.md,
  },
  wellbeingDetailRow: {
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wellbeingDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBadge: {
    backgroundColor: COLORS.roleMidwife + '20',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  scoreBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.roleMidwife,
  },
  wellbeingNote: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  generalNotesText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    marginTop: SIZES.lg,
  },
  deleteButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.error,
    marginLeft: SIZES.xs,
  },
});
