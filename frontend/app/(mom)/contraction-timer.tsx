import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Pressable,
  Share,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

// Types
interface Contraction {
  contraction_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  interval_seconds_to_previous: number | null;
  intensity: 'MILD' | 'MODERATE' | 'STRONG' | null;
  notes: string | null;
  source: 'TIMER' | 'MANUAL';
}

interface Session {
  session_id: string;
  mom_id: string;
  started_at: string;
  ended_at: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  is_shared_with_doula: boolean;
  is_shared_with_midwife: boolean;
  contraction_count: number;
  average_duration_seconds: number;
  average_interval_seconds: number;
  pattern_511_reached: boolean;
  // Phase 2 fields
  water_broke_at?: string | null;
  water_broke_note?: string | null;
  session_notes?: string | null;
  is_primary_labor_session?: boolean;
}

interface Stats {
  contraction_count: number;
  average_duration_seconds: number;
  average_duration_formatted: string;
  average_interval_seconds: number;
  average_interval_formatted: string;
}

interface PatternStatus {
  pattern_reached: boolean;
  status: string;
  message: string;
  pattern_duration_minutes?: number;
  threshold_type?: string;
}

interface TimerPreferences {
  birth_word: 'contractions' | 'surges' | 'waves';
  alert_threshold: '5-1-1' | '4-1-1' | '3-1-1' | 'custom' | 'none';
  custom_interval_minutes?: number;
  custom_duration_seconds?: number;
  custom_sustained_minutes?: number;
}

interface ChartData {
  duration_data: Array<{ x: number; y: number; timestamp: string }>;
  interval_data: Array<{ x: number; y: number; timestamp: string }>;
  intensity_data: Array<{ x: number; y: number; intensity: string }>;
}

const INTENSITIES = [
  { value: 'MILD', label: 'Mild', color: '#8BC34A' },
  { value: 'MODERATE', label: 'Moderate', color: '#FF9800' },
  { value: 'STRONG', label: 'Strong', color: '#F44336' },
];

const BIRTH_WORDS = [
  { value: 'contractions', label: 'Contractions' },
  { value: 'surges', label: 'Surges' },
  { value: 'waves', label: 'Waves' },
];

const ALERT_THRESHOLDS = [
  { value: '5-1-1', label: '5-1-1 (Standard)', description: '5 min apart, 1 min long, 1 hour' },
  { value: '4-1-1', label: '4-1-1 (Earlier)', description: '4 min apart, 1 min long, 1 hour' },
  { value: '3-1-1', label: '3-1-1 (Closer)', description: '3 min apart, 1 min long, 1 hour' },
  { value: 'none', label: 'No Alert', description: 'Track only, no alerts' },
];

// Format seconds to mm:ss
const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format interval to readable string
const formatInterval = (seconds: number | null): string => {
  if (seconds === null || seconds <= 0) return '--:--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ContractionTimerScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [contractions, setContractions] = useState<Contraction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [patternStatus, setPatternStatus] = useState<PatternStatus | null>(null);
  
  // Phase 2: Preferences
  const [preferences, setPreferences] = useState<TimerPreferences>({
    birth_word: 'contractions',
    alert_threshold: '5-1-1'
  });
  const [chartData, setChartData] = useState<ChartData | null>(null);
  
  // Timer state
  const [isContracting, setIsContracting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [restingSeconds, setRestingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modal states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showIntensityModal, setShowIntensityModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWaterBrokeModal, setShowWaterBrokeModal] = useState(false);
  const [showChartsModal, setShowChartsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  
  // Sharing preferences
  const [shareWithDoula, setShareWithDoula] = useState(false);
  const [shareWithMidwife, setShareWithMidwife] = useState(false);
  
  // Edit/Manual form state
  const [editingContraction, setEditingContraction] = useState<Contraction | null>(null);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualIntensity, setManualIntensity] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState('');
  
  // Phase 2: Water breaking & notes
  const [waterBrokeNote, setWaterBrokeNote] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  
  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Helper to get the user's preferred term
  const birthWord = preferences?.birth_word || 'contractions';
  const birthWordCapitalized = birthWord.charAt(0).toUpperCase() + birthWord.slice(1);
  
  // Pulse animation when contracting
  useEffect(() => {
    if (isContracting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isContracting]);
  
  // Timer effect
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (isContracting) {
      // Contracting timer - count up from current timerSeconds
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (session?.status === 'ACTIVE' && contractions.length > 0) {
      // Resting timer - calculate time since last contraction ended
      const lastContraction = contractions[0];
      if (lastContraction?.end_time) {
        const lastEnd = new Date(lastContraction.end_time).getTime();
        const now = Date.now();
        const initialRestSeconds = Math.floor((now - lastEnd) / 1000);
        setRestingSeconds(initialRestSeconds);
        
        timerRef.current = setInterval(() => {
          setRestingSeconds(s => s + 1);
        }, 1000);
      } else {
        // Last contraction has no end_time (shouldn't happen, but reset to 0)
        setRestingSeconds(0);
      }
    } else {
      // No contractions yet or session not active
      setRestingSeconds(0);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isContracting, session?.status, contractions]);
  
  // Fetch active session on mount
  useEffect(() => {
    fetchActiveSession();
  }, []);
  
  const fetchActiveSession = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/contractions/session/active');
      setSession(data.session);
      setContractions(data.contractions || []);
      setStats(data.stats);
      setPatternStatus(data.pattern_status);
      
      // Load preferences (Phase 2)
      if (data.preferences) {
        setPreferences(data.preferences);
      }
      
      // Load session notes if available
      if (data.session?.session_notes) {
        setSessionNotes(data.session.session_notes);
      }
      
      // Check if there's a running contraction
      if (data.contractions?.length > 0) {
        const running = data.contractions.find((c: Contraction) => c.end_time === null);
        if (running) {
          setIsContracting(true);
          const startTime = new Date(running.start_time).getTime();
          const now = Date.now();
          setTimerSeconds(Math.floor((now - startTime) / 1000));
        }
      }
      
      // Load chart data if session exists and has contractions
      if (data.session?.session_id && data.contractions?.length > 0) {
        fetchChartData(data.session.session_id);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchChartData = async (sessionId: string) => {
    try {
      const data = await apiRequest(`/contractions/session/${sessionId}/chart-data`);
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };
  
  const updatePreferences = async (newPrefs: Partial<TimerPreferences>) => {
    try {
      const data = await apiRequest('/contractions/preferences', {
        method: 'PUT',
        body: newPrefs,
      });
      setPreferences(data.preferences);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update preferences');
    }
  };
  
  const recordWaterBreaking = async () => {
    if (!session) return;
    
    try {
      const data = await apiRequest(`/contractions/session/${session.session_id}/water-broke`, {
        method: 'POST',
        body: {
          water_broke_note: waterBrokeNote || null,
        },
      });
      setSession(data.session);
      setShowWaterBrokeModal(false);
      Alert.alert('Recorded', 'Water breaking has been recorded and your care team has been notified.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record water breaking');
    }
  };
  
  const saveSessionNotes = async () => {
    if (!session) return;
    
    try {
      await apiRequest(`/contractions/session/${session.session_id}/notes?notes=${encodeURIComponent(sessionNotes)}`, {
        method: 'PUT',
      });
      setShowNotesModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save notes');
    }
  };
  
  const startSession = async () => {
    try {
      const data = await apiRequest('/contractions/session/start', {
        method: 'POST',
        body: {
          is_shared_with_doula: shareWithDoula,
          is_shared_with_midwife: shareWithMidwife,
        },
      });
      setSession(data.session);
      setShowStartModal(false);
      setContractions([]);
      setStats(null);
      setPatternStatus(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start session');
    }
  };
  
  const endSession = async () => {
    if (!session) return;
    
    const confirmEnd = () => {
      if (Platform.OS === 'web') {
        return window.confirm('Are you sure you want to end this session?');
      }
      return new Promise((resolve) => {
        Alert.alert(
          'End Session',
          'Are you sure you want to end this session?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'End', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    };
    
    const confirmed = await confirmEnd();
    if (!confirmed) return;
    
    try {
      const data = await apiRequest(`/contractions/session/${session.session_id}/end`, {
        method: 'POST',
      });
      setSession(data.session);
      setIsContracting(false);
      setTimerSeconds(0);
      setShowSummaryModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to end session');
    }
  };
  
  const startContraction = async () => {
    if (!session || session.status !== 'ACTIVE') {
      setShowStartModal(true);
      return;
    }
    
    try {
      await apiRequest('/contractions/start', { method: 'POST' });
      setIsContracting(true);
      setTimerSeconds(0);
      setRestingSeconds(0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start contraction');
    }
  };
  
  const stopContraction = async (intensity?: string) => {
    try {
      const url = intensity 
        ? `/contractions/stop?intensity=${intensity}`
        : '/contractions/stop';
      const data = await apiRequest(url, { method: 'POST' });
      
      setIsContracting(false);
      setTimerSeconds(0);
      
      // Refresh data
      await fetchActiveSession();
      
      setShowIntensityModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to stop contraction');
    }
  };
  
  const handleMainButton = () => {
    if (isContracting) {
      // Stop and show intensity picker
      setShowIntensityModal(true);
    } else {
      startContraction();
    }
  };
  
  const addManualContraction = async () => {
    if (!session) return;
    
    // Parse time input (format: HH:MM)
    const timeParts = manualStartTime.split(':');
    if (timeParts.length !== 2) {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format');
      return;
    }
    
    const now = new Date();
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      Alert.alert('Invalid Time', 'Please enter a valid time');
      return;
    }
    
    now.setHours(hours, minutes, 0, 0);
    const startTime = now.toISOString();
    
    // Parse duration
    const durationSecs = parseInt(manualDuration, 10) || 60;
    const endTime = new Date(now.getTime() + durationSecs * 1000).toISOString();
    
    try {
      await apiRequest('/contractions/manual', {
        method: 'POST',
        body: {
          start_time: startTime,
          end_time: endTime,
          intensity: manualIntensity,
          notes: manualNotes || null,
          source: 'MANUAL',
        },
      });
      
      setShowManualModal(false);
      setManualStartTime('');
      setManualDuration('');
      setManualIntensity(null);
      setManualNotes('');
      
      await fetchActiveSession();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add contraction');
    }
  };
  
  const deleteContraction = async (contractionId: string) => {
    const confirmDelete = () => {
      if (Platform.OS === 'web') {
        return window.confirm('Delete this contraction?');
      }
      return new Promise((resolve) => {
        Alert.alert(
          'Delete Contraction',
          'Are you sure you want to delete this entry?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    };
    
    const confirmed = await confirmDelete();
    if (!confirmed) return;
    
    try {
      await apiRequest(`/contractions/${contractionId}`, { method: 'DELETE' });
      await fetchActiveSession();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete contraction');
    }
  };
  
  const exportSummary = async () => {
    if (!session) return;
    
    try {
      const data = await apiRequest(`/contractions/session/${session.session_id}/export`);
      
      if (Platform.OS === 'web') {
        // Copy to clipboard on web
        navigator.clipboard.writeText(data.summary_text);
        Alert.alert('Copied', 'Summary copied to clipboard');
      } else {
        await Share.share({
          message: data.summary_text,
          title: 'Contraction Summary',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export summary');
    }
  };
  
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  
  const getPatternStatusColor = () => {
    if (!patternStatus) return colors.textLight;
    switch (patternStatus.status) {
      case '511_reached':
        return '#F44336';
      case 'progressing':
        return '#FF9800';
      default:
        return colors.accent;
    }
  };
  
  const getPatternStatusLabel = () => {
    // Don't show labor phase until we have at least 3 contractions for meaningful data
    const contractionCount = stats?.contraction_count || 0;
    if (!patternStatus || contractionCount < 3) return 'Timing...';
    
    switch (patternStatus.status) {
      case '511_reached':
        return '5-1-1 Pattern Reached';
      case 'progressing':
        return 'Progressing';
      default:
        return 'Early Labor';
    }
  };

  // No session - show start prompt
  if (!loading && !session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contraction Timer</Text>
        </View>
        
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="timer-outline" size={64} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Ready to Time Contractions?</Text>
          <Text style={styles.emptyText}>
            Start a session to track your contractions. We'll calculate the duration, 
            frequency, and let you know when you reach the 5-1-1 pattern.
          </Text>
          <Button
            title="Start Timing Session"
            onPress={() => setShowStartModal(true)}
            style={styles.startButton}
            data-testid="start-session-btn"
          />
        </View>
        
        {/* Start Session Modal */}
        <Modal
          visible={showStartModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowStartModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Start New Session</Text>
              <Text style={styles.modalSubtitle}>
                Do you want to share your contraction timing with your birth team?
              </Text>
              
              <View style={styles.sharingOptions}>
                <Pressable
                  style={[styles.sharingOption, shareWithDoula && styles.sharingOptionActive]}
                  onPress={() => setShareWithDoula(!shareWithDoula)}
                >
                  <Icon 
                    name={shareWithDoula ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={shareWithDoula ? colors.primary : colors.textLight} 
                  />
                  <Text style={styles.sharingOptionText}>Share with my Doula</Text>
                </Pressable>
                
                <Pressable
                  style={[styles.sharingOption, shareWithMidwife && styles.sharingOptionActive]}
                  onPress={() => setShareWithMidwife(!shareWithMidwife)}
                >
                  <Icon 
                    name={shareWithMidwife ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={shareWithMidwife ? colors.primary : colors.textLight} 
                  />
                  <Text style={styles.sharingOptionText}>Share with my Midwife</Text>
                </Pressable>
              </View>
              
              <Text style={styles.sharingNote}>
                You can change this setting anytime during your session.
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  title="Not Now"
                  variant="outline"
                  onPress={() => {
                    setShareWithDoula(false);
                    setShareWithMidwife(false);
                    startSession();
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Start Session"
                  onPress={startSession}
                  style={{ flex: 1, marginLeft: 8 }}
                  data-testid="confirm-start-session-btn"
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Session ended - show summary
  if (session?.status === 'ENDED') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Session Complete</Text>
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Session Summary</Text>
            
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{stats?.contraction_count || 0}</Text>
                <Text style={styles.summaryStatLabel}>Contractions</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{stats?.average_duration_formatted || '00:00'}</Text>
                <Text style={styles.summaryStatLabel}>Avg Duration</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{stats?.average_interval_formatted || '00:00'}</Text>
                <Text style={styles.summaryStatLabel}>Avg Interval</Text>
              </View>
            </View>
            
            {patternStatus?.pattern_reached && (
              <View style={styles.patternReachedBanner}>
                <Icon name="alert-circle" size={24} color="#F44336" />
                <Text style={styles.patternReachedText}>5-1-1 Pattern Was Reached</Text>
              </View>
            )}
          </View>
          
          <View style={styles.actionButtons}>
            <Button
              title="Share Summary"
              onPress={exportSummary}
              leftIcon={<Icon name="share-outline" size={20} color="#fff" />}
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Start New Session"
              variant="outline"
              onPress={() => {
                setSession(null);
                setContractions([]);
                setStats(null);
                setPatternStatus(null);
                setShowStartModal(true);
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Active session - main timer UI
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header with Settings */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{birthWordCapitalized} Timer</Text>
        <Pressable style={styles.settingsBtn} onPress={() => setShowSettingsModal(true)}>
          <Icon name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>
      
      {/* Water Broke Banner (if recorded) */}
      {session?.water_broke_at && (
        <View style={styles.waterBrokeBanner}>
          <Icon name="water-outline" size={20} color="#1976D2" />
          <Text style={styles.waterBrokeText}>
            Water broke at {new Date(session.water_broke_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            {session.water_broke_note ? ` - ${session.water_broke_note}` : ''}
          </Text>
        </View>
      )}
      
      {/* Header Stats Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.average_duration_formatted || '00:00'}</Text>
          <Text style={styles.statLabel}>Avg Duration</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.average_interval_formatted || '--:--'}</Text>
          <Text style={styles.statLabel}>Avg Interval</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.contraction_count || 0}</Text>
          <Text style={styles.statLabel}>Count</Text>
        </View>
      </View>
      
      {/* Main Timer Display */}
      <View style={styles.timerContainer}>
        <Animated.View style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.timerText}>
            {isContracting ? formatDuration(timerSeconds) : (
              session?.status === 'ACTIVE' && contractions.length > 0 
                ? formatDuration(restingSeconds)
                : '00:00'
            )}
          </Text>
          <Text style={styles.timerLabel}>
            {isContracting ? `${birthWordCapitalized.slice(0, -1)}ing...` : (
              session?.status === 'ACTIVE' && contractions.length > 0 
                ? 'Resting...'
                : 'Ready'
            )}
          </Text>
        </Animated.View>
        
        {/* Main Button */}
        <Pressable
          style={[
            styles.mainButton,
            isContracting && styles.mainButtonActive
          ]}
          onPress={handleMainButton}
          data-testid="main-timer-btn"
        >
          <Text style={styles.mainButtonText}>
            {isContracting ? `Stop ${birthWordCapitalized.slice(0, -1)}` : `Start ${birthWordCapitalized.slice(0, -1)}`}
          </Text>
        </Pressable>
      </View>
      
      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Pressable style={styles.actionBtn} onPress={() => setShowHistoryModal(true)}>
          <Icon name="list-outline" size={24} color={colors.primary} />
          <Text style={styles.actionBtnText}>History</Text>
        </Pressable>
        
        <Pressable style={styles.actionBtn} onPress={() => setShowManualModal(true)}>
          <Icon name="add-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.actionBtnText}>Add Manual</Text>
        </Pressable>
        
        <Pressable style={styles.actionBtn} onPress={exportSummary}>
          <Icon name="share-outline" size={24} color={colors.primary} />
          <Text style={styles.actionBtnText}>Share</Text>
        </Pressable>
        
        <Pressable style={styles.actionBtn} onPress={endSession}>
          <Icon name="flag-outline" size={24} color={colors.error} />
          <Text style={[styles.actionBtnText, { color: colors.error }]}>End</Text>
        </Pressable>
      </View>
      
      {/* Phase 2: Secondary Actions Row */}
      <View style={styles.secondaryActionsRow}>
        {!session?.water_broke_at && (
          <Pressable style={styles.secondaryActionBtn} onPress={() => setShowWaterBrokeModal(true)}>
            <Icon name="water" size={20} color={colors.info || colors.primary} />
            <Text style={styles.secondaryActionText}>Water Broke</Text>
          </Pressable>
        )}
        
        <Pressable style={styles.secondaryActionBtn} onPress={() => setShowNotesModal(true)}>
          <Icon name="create-outline" size={20} color={colors.primary} />
          <Text style={styles.secondaryActionText}>Notes</Text>
        </Pressable>
        
        {(chartData?.duration_data?.length || 0) >= 3 && (
          <Pressable style={styles.secondaryActionBtn} onPress={() => setShowChartsModal(true)}>
            <Icon name="stats-chart-outline" size={20} color={colors.primary} />
            <Text style={styles.secondaryActionText}>Charts</Text>
          </Pressable>
        )}
      </View>
      
      {/* Pattern Status - moved below actions, smaller and less intrusive */}
      {(stats?.contraction_count || 0) >= 1 && (
        <View style={[styles.patternStatusCompact, { backgroundColor: getPatternStatusColor() + '15', borderColor: getPatternStatusColor() + '30' }]}>
          <Icon 
            name={patternStatus?.pattern_reached ? "alert-circle" : "pulse-outline"} 
            size={16} 
            color={getPatternStatusColor()} 
          />
          <Text style={[styles.patternStatusTextCompact, { color: getPatternStatusColor() }]}>
            {getPatternStatusLabel()}
          </Text>
          {patternStatus?.pattern_reached && (
            <Text style={[styles.patternAlertInline, { color: getPatternStatusColor() }]}>
              - {patternStatus.message}
            </Text>
          )}
        </View>
      )}
      
      {/* Intensity Selection Modal */}
      <Modal
        visible={showIntensityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIntensityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How intense was that {birthWord.slice(0, -1)}?</Text>
            
            <View style={styles.intensityOptions}>
              {INTENSITIES.map((intensity) => (
                <Pressable
                  key={intensity.value}
                  style={[styles.intensityOption, { borderColor: intensity.color }]}
                  onPress={() => stopContraction(intensity.value)}
                >
                  <View style={[styles.intensityDot, { backgroundColor: intensity.color }]} />
                  <Text style={styles.intensityLabel}>{intensity.label}</Text>
                </Pressable>
              ))}
            </View>
            
            <Pressable 
              style={styles.skipIntensity}
              onPress={() => stopContraction()}
            >
              <Text style={styles.skipIntensityText}>Skip</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      
      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{birthWordCapitalized} History</Text>
              <Pressable onPress={() => setShowHistoryModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.historyList}>
              {contractions.length === 0 ? (
                <Text style={styles.emptyHistoryText}>No {birthWord} recorded yet</Text>
              ) : (
                contractions.map((c, index) => (
                  <View key={c.contraction_id} style={styles.historyItem}>
                    <View style={styles.historyItemLeft}>
                      <Text style={styles.historyItemNumber}>#{contractions.length - index}</Text>
                      <View>
                        <Text style={styles.historyItemTime}>{formatTime(c.start_time)}</Text>
                        <View style={styles.historyItemDetails}>
                          <Text style={styles.historyDetailText}>
                            Duration: {formatDuration(c.duration_seconds)}
                          </Text>
                          <Text style={styles.historyDetailText}>
                            Interval: {formatInterval(c.interval_seconds_to_previous)}
                          </Text>
                          {c.intensity && (
                            <View style={[
                              styles.intensityBadge,
                              { backgroundColor: INTENSITIES.find(i => i.value === c.intensity)?.color || colors.textLight }
                            ]}>
                              <Text style={styles.intensityBadgeText}>{c.intensity}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <Pressable 
                      style={styles.deleteBtn}
                      onPress={() => deleteContraction(c.contraction_id)}
                    >
                      <Icon name="trash-outline" size={20} color={colors.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Manual Add Modal */}
      <Modal
        visible={showManualModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Contraction Manually</Text>
              <Pressable onPress={() => setShowManualModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Start Time (HH:MM)</Text>
              <TextInput
                style={styles.formInput}
                value={manualStartTime}
                onChangeText={setManualStartTime}
                placeholder="e.g. 14:30"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Duration (seconds)</Text>
              <TextInput
                style={styles.formInput}
                value={manualDuration}
                onChangeText={setManualDuration}
                placeholder="e.g. 60"
                keyboardType="number-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Intensity</Text>
              <View style={styles.intensityRow}>
                {INTENSITIES.map((intensity) => (
                  <Pressable
                    key={intensity.value}
                    style={[
                      styles.intensityChip,
                      manualIntensity === intensity.value && { backgroundColor: intensity.color }
                    ]}
                    onPress={() => setManualIntensity(intensity.value)}
                  >
                    <Text style={[
                      styles.intensityChipText,
                      manualIntensity === intensity.value && { color: '#fff' }
                    ]}>
                      {intensity.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={manualNotes}
                onChangeText={setManualNotes}
                placeholder="Any notes..."
                multiline
              />
            </View>
            
            <Button
              title="Add Contraction"
              onPress={addManualContraction}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
      
      {/* Phase 2: Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Timer Settings</Text>
              <Pressable onPress={() => setShowSettingsModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsLabel}>What do you call them?</Text>
                <Text style={styles.settingsHint}>Choose the term you prefer</Text>
                <View style={styles.settingsOptions}>
                  {BIRTH_WORDS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.settingsOption,
                        preferences.birth_word === option.value && styles.settingsOptionActive
                      ]}
                      onPress={() => updatePreferences({ birth_word: option.value as any })}
                    >
                      <Text style={[
                        styles.settingsOptionText,
                        preferences.birth_word === option.value && styles.settingsOptionTextActive
                      ]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              
              <View style={styles.settingsSection}>
                <Text style={styles.settingsLabel}>When should I alert you?</Text>
                <Text style={styles.settingsHint}>Choose your preferred alert threshold</Text>
                {ALERT_THRESHOLDS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.alertOption,
                      preferences.alert_threshold === option.value && styles.alertOptionActive
                    ]}
                    onPress={() => updatePreferences({ alert_threshold: option.value as any })}
                  >
                    <View style={styles.alertOptionLeft}>
                      <Icon 
                        name={preferences.alert_threshold === option.value ? "radio-button-on" : "radio-button-off"} 
                        size={20} 
                        color={preferences.alert_threshold === option.value ? colors.primary : colors.textLight} 
                      />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.alertOptionTitle}>{option.label}</Text>
                        <Text style={styles.alertOptionDesc}>{option.description}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Phase 2: Water Broke Modal */}
      <Modal
        visible={showWaterBrokeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWaterBrokeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Water Breaking</Text>
              <Pressable onPress={() => setShowWaterBrokeModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <Text style={styles.waterBrokeHint}>
              Your care team will be notified. Please note any details about the fluid (color, amount, clarity).
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.formInput, { height: 100 }]}
                value={waterBrokeNote}
                onChangeText={setWaterBrokeNote}
                placeholder="e.g., Clear fluid, moderate amount..."
                multiline
              />
            </View>
            
            <Button
              title="Record Water Breaking"
              onPress={recordWaterBreaking}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
      
      {/* Phase 2: Notes Modal */}
      <Modal
        visible={showNotesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session Notes</Text>
              <Pressable onPress={() => setShowNotesModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <View style={styles.formGroup}>
              <TextInput
                style={[styles.formInput, { height: 150 }]}
                value={sessionNotes}
                onChangeText={setSessionNotes}
                placeholder="Add notes about this labor session..."
                multiline
              />
            </View>
            
            <Button
              title="Save Notes"
              onPress={saveSessionNotes}
            />
          </View>
        </View>
      </Modal>
      
      {/* Phase 2: Charts Modal */}
      <Modal
        visible={showChartsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChartsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{birthWordCapitalized} Charts</Text>
              <Pressable onPress={() => setShowChartsModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView>
              {chartData && chartData.duration_data.length >= 3 && (
                <>
                  <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Duration Over Time (seconds)</Text>
                    <LineChart
                      data={{
                        labels: chartData.duration_data.map((d: any) => `#${d.x}`).slice(-8),
                        datasets: [{ data: chartData.duration_data.map((d: any) => d.y).slice(-8) }]
                      }}
                      width={Dimensions.get('window').width - 80}
                      height={180}
                      yAxisSuffix="s"
                      chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(156, 125, 97, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: { borderRadius: 8 },
                        propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary }
                      }}
                      bezier
                      style={{ borderRadius: 8 }}
                    />
                  </View>
                  
                  {chartData.interval_data.length >= 2 && (
                    <View style={styles.chartSection}>
                      <Text style={styles.chartTitle}>Interval Over Time (minutes)</Text>
                      <LineChart
                        data={{
                          labels: chartData.interval_data.map((d: any) => `#${d.x}`).slice(-8),
                          datasets: [{ data: chartData.interval_data.map((d: any) => d.y).slice(-8) }]
                        }}
                        width={Dimensions.get('window').width - 80}
                        height={180}
                        yAxisSuffix="m"
                        chartConfig={{
                          backgroundColor: '#fff',
                          backgroundGradientFrom: '#fff',
                          backgroundGradientTo: '#fff',
                          decimalPlaces: 0,
                          color: (opacity = 1) => `rgba(97, 125, 156, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          style: { borderRadius: 8 },
                          propsForDots: { r: '4', strokeWidth: '2', stroke: colors.secondary }
                        }}
                        bezier
                        style={{ borderRadius: 8 }}
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startButton: {
    width: '100%',
    maxWidth: 300,
  },
  
  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  
  // Timer Container
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 32,
  },
  timerText: {
    fontSize: 48,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  timerLabel: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginTop: 4,
  },
  mainButton: {
    width: '100%',
    maxWidth: 300,
    paddingVertical: 20,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonActive: {
    backgroundColor: colors.secondary,
  },
  mainButtonText: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: colors.white,
  },
  
  // Pattern Status
  patternStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  patternStatusText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    marginLeft: 8,
  },
  patternAlert: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  patternAlertText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: '#C62828',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Compact Pattern Status (moved below actions)
  patternStatusCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexWrap: 'wrap',
  },
  patternStatusTextCompact: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 6,
  },
  patternAlertInline: {
    fontSize: 12,
    fontFamily: FONTS.body,
    marginLeft: 4,
    flexShrink: 1,
  },
  
  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: colors.primary,
    marginTop: 4,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  
  // Sharing options
  sharingOptions: {
    marginBottom: 16,
  },
  sharingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  sharingOptionActive: {
    backgroundColor: `${colors.primary}15`,
  },
  sharingOptionText: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: colors.text,
    marginLeft: 12,
  },
  sharingNote: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Intensity options
  intensityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  intensityOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  intensityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  intensityLabel: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  skipIntensity: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipIntensityText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.textLight,
  },
  
  // History list
  historyList: {
    maxHeight: 400,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: 40,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemNumber: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.textLight,
    width: 40,
  },
  historyItemTime: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  historyItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  historyDetailText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginRight: 12,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  intensityBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: colors.white,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
  },
  
  // Form styles
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.body,
    backgroundColor: colors.white,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  intensityChipText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  
  // Summary styles
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: colors.primary,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginTop: 4,
  },
  patternReachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
  },
  patternReachedText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: '#C62828',
    marginLeft: 8,
  },
  actionButtons: {
    paddingHorizontal: 20,
  },
  
  // Phase 2 Styles
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  settingsBtn: {
    padding: 8,
  },
  waterBrokeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  waterBrokeText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: '#1976D2',
    marginLeft: 8,
    flex: 1,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: colors.primary,
    marginLeft: 6,
  },
  
  // Settings Modal
  settingsSection: {
    marginBottom: 24,
  },
  settingsLabel: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginBottom: 4,
  },
  settingsHint: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginBottom: 12,
  },
  settingsOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  settingsOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  settingsOptionText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  settingsOptionTextActive: {
    color: colors.white,
  },
  alertOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  alertOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  alertOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertOptionTitle: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  alertOptionDesc: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginTop: 2,
  },
  
  // Water Broke Modal
  waterBrokeHint: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  
  // Charts
  chartSection: {
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
}));
