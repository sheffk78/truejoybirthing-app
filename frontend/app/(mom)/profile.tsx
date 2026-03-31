import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import AppearanceSettings from '../../src/components/AppearanceSettings';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function MomProfileScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const { isDark } = useTheme();
  
  const [profile, setProfile] = useState<any>(null);
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [team, setTeam] = useState<any>({ doula: null, midwife: null });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lookingUpZip, setLookingUpZip] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [dueDate, setDueDate] = useState('');
  const [dueDateObj, setDueDateObj] = useState<Date | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [numberOfChildren, setNumberOfChildren] = useState<number>(0);
  
  // Ref for hidden file input (web only)
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const fetchData = async () => {
    try {
      const [profileData, teamData, birthPlanData] = await Promise.all([
        apiRequest(API_ENDPOINTS.MOM_PROFILE),
        apiRequest(API_ENDPOINTS.MOM_TEAM),
        apiRequest(API_ENDPOINTS.BIRTH_PLAN).catch(() => null),
      ]);
      setProfile(profileData);
      setTeam(teamData);
      setBirthPlan(birthPlanData);
      
      // Set form values - parse due date robustly
      const dueDateStr = profileData.due_date || '';
      if (dueDateStr) {
        let parsedDate: Date;
        if (/^\d{2}-\d{2}-\d{4}$/.test(dueDateStr)) {
          // Old format: MM-DD-YYYY → parse manually to avoid JS Date misinterpretation
          const [month, day, year] = dueDateStr.split('-').map(Number);
          parsedDate = new Date(year, month - 1, day);
        } else {
          // ISO format: YYYY-MM-DD → append T00:00:00 to avoid timezone offset
          parsedDate = new Date(dueDateStr + 'T00:00:00');
        }
        setDueDateObj(parsedDate);
        // Normalize to YYYY-MM-DD for consistent storage
        const normalizedDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
        setDueDate(normalizedDate);
      } else {
        setDueDate('');
      }
      setZipCode(profileData.zip_code || '');
      setLocationCity(profileData.location_city || '');
      setLocationState(profileData.location_state || '');
      setNumberOfChildren(profileData.number_of_children || 0);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  // Get birth setting from birth plan
  const getBirthSetting = () => {
    if (birthPlan?.sections) {
      const aboutSection = birthPlan.sections.find((s: any) => s.section_id === 'about_me');
      if (aboutSection?.data?.planned_birth_location) {
        return aboutSection.data.planned_birth_location;
      }
    }
    return profile?.planned_birth_setting || 'Not set';
  };

  // Format due date for display - handles both old MM-DD-YYYY and new YYYY-MM-DD
  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
      let date: Date;
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        // Old format: MM-DD-YYYY
        const [month, day, year] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        // ISO format: YYYY-MM-DD
        date = new Date(dateStr + 'T00:00:00');
      }
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Zip code lookup
  const lookupZipCode = async (zip: string) => {
    if (zip.length !== 5) return;
    
    setLookingUpZip(true);
    try {
      const data = await apiRequest(`/lookup/zipcode/${zip}`);
      if (data.city && data.state) {
        setLocationCity(data.city);
        setLocationState(data.state);
      }
    } catch (error) {
      console.log('Zip lookup failed:', error);
    } finally {
      setLookingUpZip(false);
    }
  };

  const handleZipChange = (zip: string) => {
    // Only allow numbers
    const numericZip = zip.replace(/\D/g, '').slice(0, 5);
    setZipCode(numericZip);
    // Clear city/state when changing zip code
    if (numericZip.length < 5) {
      setLocationCity('');
      setLocationState('');
    }
    if (numericZip.length === 5) {
      lookupZipCode(numericZip);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDateObj(selectedDate);
      // Format as YYYY-MM-DD for storage
      const formatted = selectedDate.toISOString().split('T')[0];
      setDueDate(formatted);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      let date: Date;
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        // Old format: MM-DD-YYYY
        const [month, day, year] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        // ISO format: YYYY-MM-DD
        date = new Date(dateStr + 'T00:00:00');
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.MOM_PROFILE, {
        method: 'PUT',
        body: {
          due_date: dueDate,
          zip_code: zipCode,
          location_city: locationCity,
          location_state: locationState,
          number_of_children: numberOfChildren,
        },
      });
      
      await fetchData();
      setIsEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = () => {
    // Alert.alert doesn't work on web, use window.confirm instead
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) {
        logout();
        router.replace('/(auth)/welcome');
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/welcome');
            },
          },
        ]
      );
    }
  };

  // Handle web file input change
  const handleWebFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        
        await apiRequest(API_ENDPOINTS.AUTH_UPDATE_PROFILE, {
          method: 'PUT',
          body: { picture: base64Image },
        });
        
        if (updateUser) {
          updateUser({ picture: base64Image });
        }
        
        window.alert('Profile photo updated!');
        setUploadingPhoto(false);
      };
      reader.onerror = () => {
        window.alert('Failed to read image file');
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      window.alert(`Error: ${error.message || 'Failed to upload photo'}`);
      setUploadingPhoto(false);
    }
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const pickImage = async () => {
    // On web, use native file input for reliability
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    
    // Native: show options menu
    Alert.alert(
      'Update Profile Photo',
      'Choose how you want to add your photo',
      [
        {
          text: 'Take Photo',
          onPress: () => launchCamera(),
        },
        {
          text: 'Choose from Library',
          onPress: () => launchLibrary(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0]);
    }
  };

  const launchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingPhoto(true);
    try {
      // Upload as base64
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      
      await apiRequest(API_ENDPOINTS.AUTH_UPDATE_PROFILE, {
        method: 'PUT',
        body: { picture: base64Image },
      });
      
      // Update local user state
      if (updateUser) {
        updateUser({ picture: base64Image });
      }
      
      if (Platform.OS === 'web') {
        window.alert('Profile photo updated!');
      } else {
        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to upload photo';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          onChange={handleWebFileChange as any}
          style={{ display: 'none' }}
        />
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={pickImage} 
            data-testid="avatar-button"
            activeOpacity={0.7}
          >
            {uploadingPhoto ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : user?.picture ? (
              <Image 
                source={{ uri: user.picture }} 
                style={[styles.avatarImage, { pointerEvents: 'none' }]} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={40} color={colors.primary} />
              </View>
            )}
            <View style={[styles.editAvatarBadge, { pointerEvents: 'none' }]}>
              <Icon name="camera" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.userName, { color: colors.text.primary }]}>{user?.full_name}</Text>
          <Text style={[styles.userEmail, { color: colors.text.secondary }]}>{user?.email}</Text>
          <Text style={[styles.tapToEdit, { color: colors.text.muted }]}>Tap photo to update</Text>
        </View>
        
        {/* Profile Info */}
        <Card style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profile Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          
          {isEditing ? (
            <View>
              {/* Due Date with calendar picker */}
              <View style={styles.dateInputContainer}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => {
                    console.log('Due date button pressed');
                    setShowDatePicker(true);
                  }}
                  activeOpacity={0.7}
                  data-testid="due-date-picker-btn"
                >
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={[styles.datePickerText, !dueDate && styles.datePickerPlaceholder]}>
                    {dueDate ? formatDisplayDate(dueDate) : 'Tap to select your due date'}
                  </Text>
                  <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Date Picker Modal */}
              {showDatePicker && (
                Platform.OS === 'web' ? (
                  <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <View style={styles.dateModalOverlay}>
                      <View style={styles.dateModalContent}>
                        <View style={styles.dateModalHeader}>
                          <Text style={styles.dateModalTitle}>Select Due Date</Text>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Icon name="close" size={24} color={colors.text} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.webCalendarWrapper}>
                          <input
                            type="date"
                            value={dueDate || ''}
                            onChange={(e: any) => {
                              setDueDate(e.target.value);
                              if (e.target.value) {
                                setDueDateObj(new Date(e.target.value));
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
                            }}
                          />
                        </View>
                        <Button
                          title="Done"
                          onPress={() => setShowDatePicker(false)}
                          fullWidth
                          style={{ marginTop: 16 }}
                        />
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={dueDateObj || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                      maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                    />
                    {Platform.OS === 'ios' && (
                      <Button
                        title="Done"
                        onPress={() => setShowDatePicker(false)}
                        size="sm"
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </View>
                )
              )}
              
              <Input
                label="Zip Code"
                placeholder="Enter 5-digit zip code"
                value={zipCode}
                onChangeText={handleZipChange}
                leftIcon="location-outline"
                keyboardType="numeric"
                maxLength={5}
              />
              {lookingUpZip && (
                <View style={styles.zipLookupRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.zipLookupText}>Looking up location...</Text>
                </View>
              )}
              {locationCity && locationState && (
                <View style={styles.locationDisplay}>
                  <Icon name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.locationDisplayText}>{locationCity}, {locationState}</Text>
                </View>
              )}
              
              {/* Number of Children */}
              <View style={styles.childrenInputContainer}>
                <Text style={styles.inputLabel}>Number of Children</Text>
                <View style={styles.childrenStepper}>
                  <TouchableOpacity 
                    style={[styles.stepperButton, numberOfChildren === 0 && styles.stepperButtonDisabled]}
                    onPress={() => setNumberOfChildren(Math.max(0, numberOfChildren - 1))}
                    disabled={numberOfChildren === 0}
                  >
                    <Icon name="remove" size={20} color={numberOfChildren === 0 ? colors.textLight : colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.childrenCount}>{numberOfChildren}</Text>
                  <TouchableOpacity 
                    style={styles.stepperButton}
                    onPress={() => setNumberOfChildren(numberOfChildren + 1)}
                  >
                    <Icon name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.childrenHint}>Including this pregnancy</Text>
              </View>
              
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                fullWidth
                style={{ marginTop: SIZES.md }}
              />
            </View>
          ) : (
            <View>
              <View style={styles.infoRow}>
                <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Due Date</Text>
                  <Text style={styles.infoValue}>{formatDueDate(profile?.due_date)}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="location-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {profile?.location_city && profile?.location_state
                      ? `${profile.location_city}, ${profile.location_state}`
                      : profile?.zip_code 
                      ? `Zip: ${profile.zip_code}`
                      : 'Not set'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="add-circle-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Birth Setting</Text>
                  <Text style={styles.infoValue}>{getBirthSetting()}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="people-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Children</Text>
                  <Text style={styles.infoValue}>
                    {profile?.number_of_children 
                      ? `${profile.number_of_children} Kid${profile.number_of_children > 1 ? 's' : ''}`
                      : 'Not set'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>
        
        {/* Appearance Settings */}
        <Card style={styles.menuCard}>
          <AppearanceSettings showLabel={true} />
        </Card>
        
        {/* Getting Started */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/(mom)/getting-started')}
          data-testid="getting-started-btn"
        >
          <Card style={styles.menuCard}>
            <View style={styles.menuRow}>
              <Icon name="rocket-outline" size={24} color={colors.primary} />
              <Text style={styles.menuText}>Getting Started</Text>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* App Tutorial */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/tutorial?role=MOM')}
          data-testid="view-app-tour-btn"
        >
          <Card style={styles.menuCard}>
            <View style={styles.menuRow}>
              <Icon name="eye-outline" size={24} color={colors.accent} />
              <Text style={styles.menuText}>View App Tour</Text>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          data-testid="logout-btn"
        >
          <Icon name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        {/* Legal Links - App Store Compliance */}
        <View style={styles.legalSection}>
          <View style={styles.legalLinks}>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://truejoybirthing.com/privacy-policy/')}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://truejoybirthing.com/disclaimer/')}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>Disclaimer</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.legalLinks}>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://truejoybirthing.com/terms-of-service/')}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://truejoybirthing.com/contact/')}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  avatarContainer: {
    marginBottom: SIZES.sm,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  dateInputContainer: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.textSecondary,
    marginBottom: SIZES.xs,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    minHeight: 52,
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
  datePickerContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  dateModalContent: {
    backgroundColor: colors.white,
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
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  webCalendarWrapper: {
    marginVertical: SIZES.md,
  },
  datePickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    height: 48,
  },
  userName: {
    fontSize: SIZES.fontXl,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: SIZES.fontMd,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tapToEdit: {
    fontSize: SIZES.fontXs,
    color: colors.textLight,
    marginTop: 4,
  },
  zipLookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
    gap: SIZES.xs,
  },
  zipLookupText: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
    paddingHorizontal: SIZES.sm,
    backgroundColor: colors.success + '15',
    borderRadius: SIZES.radiusSm,
    marginTop: SIZES.xs,
    gap: SIZES.xs,
  },
  locationDisplayText: {
    fontSize: SIZES.fontSm,
    color: colors.success,
    fontWeight: '500',
  },
  childrenInputContainer: {
    marginTop: SIZES.md,
  },
  childrenStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.sm,
    gap: SIZES.lg,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    borderColor: colors.textLight,
    opacity: 0.5,
  },
  childrenCount: {
    fontSize: SIZES.fontXxl,
    fontWeight: '600',
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  childrenHint: {
    fontSize: SIZES.fontXs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
  profileCard: {
    marginBottom: SIZES.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  cardTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
  },
  editButton: {
    fontSize: SIZES.fontMd,
    color: colors.primary,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoText: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.fontMd,
    color: colors.text,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
  },
  cityInput: {
    flex: 2,
    marginRight: SIZES.sm,
  },
  stateInput: {
    flex: 1,
  },
  teamCard: {
    marginBottom: SIZES.md,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamRole: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
  },
  teamName: {
    fontSize: SIZES.fontMd,
    color: colors.text,
    fontWeight: '500',
  },
  teamEmpty: {
    fontSize: SIZES.fontMd,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  connectButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
    backgroundColor: colors.primaryLight + '30',
  },
  connectText: {
    fontSize: SIZES.fontSm,
    color: colors.primary,
    fontWeight: '500',
  },
  menuCard: {
    marginBottom: SIZES.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    marginLeft: SIZES.md,
    fontSize: SIZES.fontMd,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    marginTop: SIZES.md,
  },
  logoutText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.error,
    marginLeft: SIZES.sm,
  },
  legalSection: {
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xs,
  },
  legalLink: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  legalLinkText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
  },
  legalSeparator: {
    fontSize: SIZES.fontXs,
    color: colors.textLight,
  },
}));
