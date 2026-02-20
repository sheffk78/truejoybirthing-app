// Unified Client Detail Screen - Used by both Doula and Midwife
// Midwife gets additional clinical tabs (Prenatal Visits, Birth Day)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';
import { ProviderConfig } from './config/providerConfig';
import { LaborSection, BirthRecordSection } from '../midwife';

// ============== TYPES ==============
interface Client {
  client_id: string;
  name: string;
  email?: string;
  phone?: string;
  due_date?: string;
  birth_date?: string;
  edd?: string;
  status: string;
  planned_birth_setting?: string;
  picture?: string;
  linked_mom_id?: string;
  is_active?: boolean;
  _counts?: {
    appointments: number;
    notes: number;
    contracts: number;
    invoices: number;
    visits: number;
  };
}

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

interface BirthRecord {
  birth_record_id?: string;
  client_id: string;
  birth_date?: string;
  birth_time?: string;
  birth_setting?: string;
  delivery_type?: string;
  baby_weight?: string;
  baby_length?: string;
  apgar_1min?: number;
  apgar_5min?: number;
  baby_gender?: string;
  complications?: string;
  notes?: string;
}

interface ClientDetailProps {
  config: ProviderConfig;
}

// ============== CONSTANTS ==============
const URINALYSIS_OPTIONS = ['Normal', 'Protein +', 'Protein ++', 'Glucose +', 'Glucose ++', 'Protein & Glucose +', 'Other'];

const WELLBEING_SCALE = [
  { value: 1, label: '1 - Struggling' },
  { value: 2, label: '2 - Challenging' },
  { value: 3, label: '3 - Okay' },
  { value: 4, label: '4 - Good' },
  { value: 5, label: '5 - Great' },
];

// ============== MAIN COMPONENT ==============
export default function ProviderClientDetail({ config }: ClientDetailProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const clientId = params.clientId as string;
  const clientName = params.clientName as string;
  
  const primaryColor = config.primaryColor;
  const isMidwife = config.role === 'MIDWIFE';
  
  // Core state
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Prenatal visits state (midwife only)
  const [prenatalVisits, setPrenatalVisits] = useState<PrenatalVisit[]>([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<PrenatalVisit | null>(null);
  const [showVisitDetail, setShowVisitDetail] = useState<PrenatalVisit | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Birth record state (midwife only)
  const [birthRecord, setBirthRecord] = useState<BirthRecord | null>(null);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthSetting, setBirthSetting] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [babyWeight, setBabyWeight] = useState('');
  const [babyLength, setBabyLength] = useState('');
  const [apgar1min, setApgar1min] = useState('');
  const [apgar5min, setApgar5min] = useState('');
  const [babyGender, setBabyGender] = useState('');
  const [birthComplications, setBirthComplications] = useState('');
  const [birthNotes, setBirthNotes] = useState('');
  
  // Prenatal visit form state
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

  // ============== DATA FETCHING ==============
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    
    try {
      // Fetch client details
      const clientData = await apiRequest(`${config.endpoints.clients}/${clientId}`);
      setClient(clientData);
      
      // Fetch prenatal visits for midwives
      if (isMidwife) {
        try {
          const visitsData = await apiRequest(`/midwife/clients/${clientId}/prenatal-visits`);
          setPrenatalVisits(visitsData || []);
        } catch (e) {
          console.log('No prenatal visits endpoint or error:', e);
        }
        
        // Fetch birth record
        try {
          const birthData = await apiRequest(`/provider/clients/${clientId}/birth-record`);
          if (birthData && Object.keys(birthData).length > 0) {
            setBirthRecord(birthData);
            // Pre-fill form if record exists
            setBirthDate(birthData.birth_date || '');
            setBirthTime(birthData.birth_time || '');
            setBirthSetting(birthData.birth_setting || '');
            setDeliveryType(birthData.delivery_type || '');
            setBabyWeight(birthData.baby_weight || '');
            setBabyLength(birthData.baby_length || '');
            setApgar1min(birthData.apgar_1min?.toString() || '');
            setApgar5min(birthData.apgar_5min?.toString() || '');
            setBabyGender(birthData.baby_gender || '');
            setBirthComplications(birthData.complications || '');
            setBirthNotes(birthData.notes || '');
          }
        } catch (e) {
          console.log('No birth record or error:', e);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load client details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId, config.endpoints.clients, isMidwife]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // ============== HELPERS ==============
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDaysUntilDue = () => {
    const dueDate = client?.due_date || client?.edd;
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days past due`;
    if (diffDays === 0) return 'Due today!';
    return `${diffDays} days until due`;
  };

  // ============== PRENATAL VISIT HANDLERS ==============
  const resetVisitForm = () => {
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
    resetVisitForm();
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
      resetVisitForm();
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

  // ============== BIRTH RECORD HANDLERS ==============
  const handleSaveBirthRecord = async () => {
    if (!birthDate) {
      Alert.alert('Error', 'Please enter the birth date');
      return;
    }
    
    setSaving(true);
    try {
      const birthData = {
        birth_date: birthDate,
        birth_time: birthTime || undefined,
        birth_setting: birthSetting || undefined,
        delivery_type: deliveryType || undefined,
        baby_weight: babyWeight || undefined,
        baby_length: babyLength || undefined,
        apgar_1min: apgar1min ? parseInt(apgar1min) : undefined,
        apgar_5min: apgar5min ? parseInt(apgar5min) : undefined,
        baby_gender: babyGender || undefined,
        complications: birthComplications || undefined,
        notes: birthNotes || undefined,
      };
      
      await apiRequest(`/provider/clients/${clientId}/birth-record`, {
        method: 'POST',
        body: birthData,
      });
      
      Alert.alert('Success', 'Birth record saved');
      setShowBirthModal(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save birth record');
    } finally {
      setSaving(false);
    }
  };

  // ============== RENDER HELPERS ==============
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
              value === item.value && [styles.scoreButtonSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
            ]}
            onPress={() => onChange(value === item.value ? null : item.value)}
          >
            <Text style={[styles.scoreButtonText, value === item.value && styles.scoreButtonTextSelected]}>
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

  // ============== LOADING STATE ==============
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Client not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  // ============== MAIN RENDER ==============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbHeader}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={() => router.replace(config.routes.clients as any)}
            style={styles.breadcrumbItem}
          >
            <Text style={[styles.breadcrumbLink, { color: primaryColor }]}>Clients</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <Text style={styles.breadcrumbCurrent}>{client?.name || clientName}</Text>
        </View>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Client Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {client.picture ? (
              <Image source={{ uri: client.picture }} style={[styles.avatarImage, { borderColor: primaryColor }]} />
            ) : (
              <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
                <Text style={styles.avatarText}>{(client?.name || clientName || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{client?.name || clientName}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: primaryColor + '20' }]}>
                  <Text style={[styles.statusText, { color: primaryColor }]}>{client?.status || 'Active'}</Text>
                </View>
                {(client?.edd || client?.due_date) && (
                  <Text style={styles.eddText}>EDD: {formatDate(client.edd || client.due_date || '')}</Text>
                )}
              </View>
              {getDaysUntilDue() && (
                <Text style={[styles.daysUntilText, { color: primaryColor }]}>{getDaysUntilDue()}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Icon name="mail-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{client?.email || 'No email'}</Text>
            </View>
            {client?.phone && (
              <View style={styles.detailRow}>
                <Icon name="call-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{client.phone}</Text>
              </View>
            )}
            {client?.planned_birth_setting && (
              <View style={styles.detailRow}>
                <Icon name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{client.planned_birth_setting}</Text>
              </View>
            )}
          </View>
        </Card>
        
        {/* Quick Actions - Same for both roles */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.contracts as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-contract"
          >
            <View style={[styles.actionIcon, { backgroundColor: primaryColor + '15' }]}>
              <Icon name="document-text-outline" size={20} color={primaryColor} />
            </View>
            <Text style={styles.actionLabel}>Contract</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.invoices as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-invoice"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Icon name="cash-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.actionLabel}>Invoice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.appointments as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-schedule"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Icon name="calendar-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.notes as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-notes"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Icon name="create-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Second row of actions */}
        <View style={styles.actionsRow}>
          {/* Birth Plan - Both roles */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (client.linked_mom_id) {
                router.push({ 
                  pathname: (config.routes.clientBirthPlans || config.routes.clients) as any, 
                  params: { momUserId: client.linked_mom_id, clientName: client?.name || clientName } 
                });
              } else {
                Alert.alert('Not Available', 'This client is not linked to a registered user yet.');
              }
            }}
            data-testid="action-birthplan"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleDoula + '15' }]}>
              <Icon name="heart-outline" size={20} color={COLORS.roleDoula} />
            </View>
            <Text style={styles.actionLabel}>Birth Plan</Text>
          </TouchableOpacity>
          
          {/* Messages */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (client.linked_mom_id) {
                router.push({ pathname: config.routes.messages as any, params: { userId: client.linked_mom_id } });
              } else {
                Alert.alert('Not Available', 'This client is not linked to a registered user yet.');
              }
            }}
            data-testid="action-messages"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent + '15' }]}>
              <Icon name="chatbubbles-outline" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.actionLabel}>Messages</Text>
          </TouchableOpacity>

          {/* Prenatal Visits - Midwife only */}
          {isMidwife && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={openAddVisit}
              data-testid="action-visit"
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.roleMidwife + '15' }]}>
                <Icon name="clipboard-outline" size={20} color={COLORS.roleMidwife} />
              </View>
              <Text style={styles.actionLabel}>Add Visit</Text>
            </TouchableOpacity>
          )}

          {/* Birth Day Record - Midwife only */}
          {isMidwife && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowBirthModal(true)}
              data-testid="action-birth"
            >
              <View style={[styles.actionIcon, { backgroundColor: birthRecord ? COLORS.success + '15' : COLORS.error + '15' }]}>
                <Icon 
                  name={birthRecord ? 'checkmark-circle' : 'fitness-outline'} 
                  size={20} 
                  color={birthRecord ? COLORS.success : COLORS.error} 
                />
              </View>
              <Text style={styles.actionLabel}>{birthRecord ? 'Birth Record' : 'Birth Day'}</Text>
            </TouchableOpacity>
          )}
          
          {/* Placeholder for alignment - only for non-midwife */}
          {!isMidwife && <View style={styles.actionButton} />}
          {!isMidwife && <View style={styles.actionButton} />}
        </View>

        {/* Third row of actions - Midwife only for Labor tracking */}
        {isMidwife && (
          <View style={[styles.actionsRow, { justifyContent: 'flex-start' }]}>
            {/* Labor Records Quick Access */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                // Scroll to Labor section - the LaborSection component handles add modal
              }}
              data-testid="action-labor"
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '15' }]}>
                <Icon name="pulse-outline" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.actionLabel}>Labor Log</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Prenatal Visits Section - Midwife Only */}
        {isMidwife && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon name="clipboard-outline" size={22} color={primaryColor} />
                <Text style={styles.sectionTitle}>Prenatal Visits</Text>
                <Text style={styles.visitCount}>({prenatalVisits.length})</Text>
              </View>
              <TouchableOpacity
                style={[styles.addVisitButton, { backgroundColor: primaryColor }]}
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
                      <View style={[styles.visitDateBadge, { backgroundColor: primaryColor + '15' }]}>
                        <Icon name="calendar-outline" size={14} color={primaryColor} />
                        <Text style={[styles.visitDateText, { color: primaryColor }]}>{formatDate(visit.visit_date)}</Text>
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
        )}

        {/* Labor Records Section - Midwife Only */}
        {isMidwife && (
          <LaborSection
            clientId={clientId}
            primaryColor={primaryColor}
            onRefresh={fetchData}
          />
        )}
      </ScrollView>
      
      {/* Add/Edit Visit Modal - Midwife Only */}
      {isMidwife && (
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
                        urinalysis === option && [styles.urinalysisOptionSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
                      ]}
                      onPress={() => setUrinalysis(urinalysis === option ? '' : option)}
                    >
                      <Text
                        style={[styles.urinalysisOptionText, urinalysis === option && styles.urinalysisOptionTextSelected]}
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
                      style={[styles.unitOption, weightUnit === 'lbs' && [styles.unitOptionSelected, { backgroundColor: primaryColor }]]}
                      onPress={() => setWeightUnit('lbs')}
                    >
                      <Text style={[styles.unitText, weightUnit === 'lbs' && styles.unitTextSelected]}>lbs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitOption, weightUnit === 'kg' && [styles.unitOptionSelected, { backgroundColor: primaryColor }]]}
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
      )}
      
      {/* Visit Detail Modal - Midwife Only */}
      {isMidwife && (
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
                <Icon name="create-outline" size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>
            
            {showVisitDetail && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.detailDateHeader}>
                  <Icon name="calendar" size={20} color={primaryColor} />
                  <Text style={[styles.detailDate, { color: primaryColor }]}>{formatDate(showVisitDetail.visit_date)}</Text>
                </View>
                
                {/* Vitals Section */}
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Vitals & Measurements</Text>
                  
                  {showVisitDetail.urinalysis && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Urinalysis:</Text>
                      <Text style={styles.detailValue}>{showVisitDetail.urinalysis}</Text>
                    </View>
                  )}
                  {showVisitDetail.blood_pressure && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Blood Pressure:</Text>
                      <Text style={styles.detailValue}>{showVisitDetail.blood_pressure}</Text>
                    </View>
                  )}
                  {showVisitDetail.fetal_heart_rate && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Fetal Heart Rate:</Text>
                      <Text style={styles.detailValue}>{showVisitDetail.fetal_heart_rate} bpm</Text>
                    </View>
                  )}
                  {showVisitDetail.fundal_height && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Fundal Height:</Text>
                      <Text style={styles.detailValue}>{showVisitDetail.fundal_height} cm</Text>
                    </View>
                  )}
                  {showVisitDetail.weight && (
                    <View style={styles.detailInfoRow}>
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
                        <View style={[styles.scoreBadge, { backgroundColor: primaryColor + '20' }]}>
                          <Text style={[styles.scoreBadgeText, { color: primaryColor }]}>{item.score}/5</Text>
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
      )}

      {/* Birth Day Modal - Midwife Only */}
      {isMidwife && (
        <Modal
          visible={showBirthModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowBirthModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowBirthModal(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Birth Day Record</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Birth Date & Time */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Birth Date & Time</Text>
                
                <Text style={styles.fieldLabel}>Birth Date *</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
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
                    value={birthDate}
                    onChangeText={setBirthDate}
                  />
                )}
                
                <Text style={styles.fieldLabel}>Birth Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 14:32"
                  placeholderTextColor={COLORS.textLight}
                  value={birthTime}
                  onChangeText={setBirthTime}
                />
              </View>
              
              {/* Birth Details */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Birth Details</Text>
                
                <Text style={styles.fieldLabel}>Birth Setting</Text>
                <View style={styles.urinalysisRow}>
                  {['Hospital', 'Birth Center', 'Home'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.urinalysisOption,
                        birthSetting === option && [styles.urinalysisOptionSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
                      ]}
                      onPress={() => setBirthSetting(birthSetting === option ? '' : option)}
                    >
                      <Text
                        style={[styles.urinalysisOptionText, birthSetting === option && styles.urinalysisOptionTextSelected]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.fieldLabel}>Delivery Type</Text>
                <View style={styles.urinalysisRow}>
                  {['Vaginal', 'C-Section', 'VBAC', 'Water Birth', 'Assisted'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.urinalysisOption,
                        deliveryType === option && [styles.urinalysisOptionSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
                      ]}
                      onPress={() => setDeliveryType(deliveryType === option ? '' : option)}
                    >
                      <Text
                        style={[styles.urinalysisOptionText, deliveryType === option && styles.urinalysisOptionTextSelected]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Baby Stats */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Baby Information</Text>
                
                <Text style={styles.fieldLabel}>Baby Gender</Text>
                <View style={styles.urinalysisRow}>
                  {['Boy', 'Girl'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.urinalysisOption,
                        babyGender === option && [styles.urinalysisOptionSelected, { backgroundColor: option === 'Boy' ? '#60A5FA' : '#F472B6', borderColor: option === 'Boy' ? '#60A5FA' : '#F472B6' }],
                      ]}
                      onPress={() => setBabyGender(babyGender === option ? '' : option)}
                    >
                      <Text
                        style={[styles.urinalysisOptionText, babyGender === option && styles.urinalysisOptionTextSelected]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.fieldLabel}>Birth Weight (lbs oz)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 7 lbs 8 oz"
                  placeholderTextColor={COLORS.textLight}
                  value={babyWeight}
                  onChangeText={setBabyWeight}
                />
                
                <Text style={styles.fieldLabel}>Birth Length (inches)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 20.5"
                  placeholderTextColor={COLORS.textLight}
                  value={babyLength}
                  onChangeText={setBabyLength}
                />
                
                <Text style={styles.fieldLabel}>APGAR Score (1 min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0-10"
                  placeholderTextColor={COLORS.textLight}
                  value={apgar1min}
                  onChangeText={setApgar1min}
                  keyboardType="numeric"
                />
                
                <Text style={styles.fieldLabel}>APGAR Score (5 min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0-10"
                  placeholderTextColor={COLORS.textLight}
                  value={apgar5min}
                  onChangeText={setApgar5min}
                  keyboardType="numeric"
                />
              </View>
              
              {/* Notes */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Additional Notes</Text>
                
                <Text style={styles.fieldLabel}>Complications (if any)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter any complications..."
                  placeholderTextColor={COLORS.textLight}
                  value={birthComplications}
                  onChangeText={setBirthComplications}
                />
                
                <Text style={styles.fieldLabel}>Birth Story Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes about the birth experience..."
                  placeholderTextColor={COLORS.textLight}
                  value={birthNotes}
                  onChangeText={setBirthNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={{ height: 40 }} />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title={birthRecord ? 'Update Birth Record' : 'Save Birth Record'}
                onPress={handleSaveBirthRecord}
                loading={saving}
                fullWidth
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ============== STYLES ==============
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.md,
  },
  errorText: {
    fontSize: SIZES.fontLg,
    color: COLORS.error,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
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
  daysUntilText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    fontStyle: 'italic',
    marginTop: SIZES.xs,
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
    marginBottom: SIZES.sm,
    ...SHADOWS.sm,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    minWidth: 70,
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
    marginTop: SIZES.md,
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
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  visitDateText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
  },
  visitSummary: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  vitalsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vitalLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textLight,
    marginRight: 4,
  },
  vitalValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  // Modal styles
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
  // Form styles
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
    borderColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
  // Detail modal styles
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
  detailInfoRow: {
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
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  scoreBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
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
