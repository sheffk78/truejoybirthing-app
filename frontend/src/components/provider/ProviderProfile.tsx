// Shared Profile Screen for Doula and Midwife
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { apiRequest, uploadImage } from '../../utils/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ProviderConfig } from './config/providerConfig';

const MAX_BIO_LENGTH = 800;

// YouTube helpers
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

interface ProviderProfileProps {
  config: ProviderConfig;
}

export default function ProviderProfile({ config }: ProviderProfileProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { status: subscriptionData, fetchStatus: fetchSubscriptionStatus } = useSubscriptionStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Common form state
  const [practiceName, setPracticeName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [yearsInPractice, setYearsInPractice] = useState('');
  const [videoIntroUrl, setVideoIntroUrl] = useState('');
  const [moreAboutMe, setMoreAboutMe] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [acceptingClients, setAcceptingClients] = useState(true);
  
  // Doula-specific
  const [zipCode, setZipCode] = useState('');
  const [lookingUpZip, setLookingUpZip] = useState(false);
  
  // Midwife-specific
  const [credentials, setCredentials] = useState('');

  const primaryColor = config.primaryColor;
  const isMidwife = config.role === 'MIDWIFE';
  const roleIcon = isMidwife ? 'medkit' : 'heart';
  
  const handleZipChange = async (zip: string) => {
    setZipCode(zip);
    if (zip.length === 5) {
      setLookingUpZip(true);
      try {
        const data = await apiRequest(`/lookup/zipcode/${zip}`);
        setLocationCity(data.city || '');
        setLocationState(data.state || '');
      } catch (error) {
        console.error('Zip lookup failed:', error);
      } finally {
        setLookingUpZip(false);
      }
    }
  };
  
  const fetchProfile = async () => {
    try {
      const data = await apiRequest(config.endpoints.profile);
      setProfile(data);
      setPracticeName(data.practice_name || '');
      setLocationCity(data.location_city || '');
      setLocationState(data.location_state || '');
      setYearsInPractice(data.years_in_practice?.toString() || '');
      setVideoIntroUrl(data.video_intro_url || '');
      setMoreAboutMe(data.more_about_me || '');
      setProfilePicture(data.picture || null);
      setAcceptingClients(data.accepting_clients !== false && data.accepting_new_clients !== false);
      
      if (isMidwife) {
        setCredentials(data.credentials || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  
  useEffect(() => {
    fetchProfile();
    fetchSubscriptionStatus();
  }, []);

  useEffect(() => {
    if (videoIntroUrl) {
      const videoId = getYouTubeVideoId(videoIntroUrl);
      setVideoError(!videoId);
    } else {
      setVideoError(false);
    }
  }, [videoIntroUrl]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const imageUrl = await uploadImage(uri, 'profile');
      setProfilePicture(imageUrl);
      
      await apiRequest(config.endpoints.profile, {
        method: 'PUT',
        body: { picture: imageUrl },
      });
      
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Update Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = {
        practice_name: practiceName,
        location_city: locationCity,
        location_state: locationState,
        years_in_practice: yearsInPractice ? parseInt(yearsInPractice) : null,
        video_intro_url: videoIntroUrl || null,
        more_about_me: moreAboutMe || null,
      };
      
      if (isMidwife) {
        body.credentials = credentials;
        body.accepting_clients = acceptingClients;
      } else {
        body.accepting_new_clients = acceptingClients;
      }
      
      await apiRequest(config.endpoints.profile, {
        method: 'PUT',
        body,
      });
      
      await fetchProfile();
      setIsEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = async () => {
    // On web, use window.confirm for cross-browser compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) {
        try {
          await logout();
          router.replace('/(auth)/welcome');
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
    } else {
      // Native Alert for mobile
      Alert.alert('Logout', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/welcome');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]);
    }
  };

  const videoId = getYouTubeVideoId(videoIntroUrl);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid={`${config.role.toLowerCase()}-profile-screen`}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with Profile Photo */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.avatarContainer, { backgroundColor: primaryColor }]} 
            onPress={showPhotoOptions}
            disabled={uploadingPhoto}
            data-testid="profile-photo-btn"
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="large" color={COLORS.white} />
            ) : profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
            ) : (
              <Icon name="person" size={40} color={COLORS.white} />
            )}
            <View style={[styles.cameraIconOverlay, { backgroundColor: primaryColor }]}>
              <Icon name="camera" size={16} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change photo</Text>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: primaryColor }]}>
            <Icon name={roleIcon as any} size={14} color={COLORS.white} />
            <Text style={styles.roleText}>{config.roleLabel}</Text>
          </View>
        </View>
        
        {/* Profile Info Card */}
        <Card style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Practice Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={[styles.editButton, { color: primaryColor }]}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {isEditing ? (
            <View>
              <Input
                label="Practice Name"
                placeholder="Your practice name"
                value={practiceName}
                onChangeText={setPracticeName}
              />
              
              {/* Midwife: Credentials field */}
              {isMidwife && (
                <Input
                  label="Credentials"
                  placeholder="e.g., CPM, CNM, LM"
                  value={credentials}
                  onChangeText={setCredentials}
                />
              )}
              
              {/* Doula: Zip code lookup */}
              {!isMidwife && (
                <>
                  <Input
                    label="Zip Code"
                    placeholder="Enter 5-digit zip code"
                    value={zipCode}
                    onChangeText={handleZipChange}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                  {lookingUpZip && (
                    <View style={styles.zipLookupStatus}>
                      <ActivityIndicator size="small" color={primaryColor} />
                      <Text style={styles.zipLookupText}>Looking up location...</Text>
                    </View>
                  )}
                </>
              )}
              
              <View style={styles.locationRow}>
                <Input
                  label="City"
                  placeholder="City"
                  value={locationCity}
                  onChangeText={setLocationCity}
                  containerStyle={styles.cityInput}
                  editable={isMidwife}
                />
                <Input
                  label="State"
                  placeholder="State"
                  value={locationState}
                  onChangeText={setLocationState}
                  containerStyle={styles.stateInput}
                  editable={isMidwife}
                />
              </View>
              
              <Input
                label="Years in Practice"
                placeholder="e.g., 5"
                value={yearsInPractice}
                onChangeText={setYearsInPractice}
                keyboardType="number-pad"
              />
              
              {/* Accepting Clients Toggle */}
              <TouchableOpacity 
                style={styles.toggleRow}
                onPress={() => setAcceptingClients(!acceptingClients)}
              >
                <Text style={styles.toggleLabel}>Accepting New Clients</Text>
                <View style={[styles.toggle, acceptingClients && { backgroundColor: primaryColor }]}>
                  <View style={[styles.toggleDot, acceptingClients && styles.toggleDotActive]} />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.infoRow}>
                <Icon name="medical-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Practice Name</Text>
                  <Text style={styles.infoValue}>{profile?.practice_name || 'Not set'}</Text>
                </View>
              </View>
              
              {isMidwife && (
                <View style={styles.infoRow}>
                  <Icon name="ribbon-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Credentials</Text>
                    <Text style={styles.infoValue}>{profile?.credentials || 'Not set'}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <Icon name="location-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {profile?.location_city && profile?.location_state
                      ? `${profile.location_city}, ${profile.location_state}`
                      : 'Not set'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Icon name="time-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Years in Practice</Text>
                  <Text style={styles.infoValue}>
                    {profile?.years_in_practice ? `${profile.years_in_practice} years` : 'Not set'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Icon name="checkmark-circle-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Accepting Clients</Text>
                  <Text style={styles.infoValue}>
                    {(isMidwife ? profile?.accepting_clients : profile?.accepting_new_clients) !== false ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Video Introduction */}
        <Card style={styles.profileCard}>
          <Text style={styles.cardTitle}>Video Introduction</Text>
          <Text style={styles.fieldDescription}>
            Add a YouTube video to introduce yourself to potential clients
          </Text>
          
          {isEditing ? (
            <View>
              <TextInput
                style={[styles.videoInput, videoError && styles.videoInputError]}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={COLORS.textLight}
                value={videoIntroUrl}
                onChangeText={setVideoIntroUrl}
                autoCapitalize="none"
              />
              {videoError && (
                <Text style={styles.errorText}>Please enter a valid YouTube URL</Text>
              )}
            </View>
          ) : videoId ? (
            <TouchableOpacity 
              style={styles.videoPreview}
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
                }
              }}
            >
              <Image source={{ uri: getYouTubeThumbnail(videoId) }} style={styles.videoThumbnail} />
              <View style={styles.playIconOverlay}>
                <Icon name="play-circle" size={48} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noVideoContainer}>
              <Icon name="videocam-outline" size={32} color={COLORS.textLight} />
              <Text style={styles.noVideoText}>No video added yet</Text>
            </View>
          )}
        </Card>

        {/* More About Me */}
        <Card style={styles.profileCard}>
          <Text style={styles.cardTitle}>More About Me</Text>
          <Text style={styles.fieldDescription}>
            Tell potential clients more about yourself and your approach
          </Text>
          
          {isEditing ? (
            <View>
              <TextInput
                style={styles.bioInput}
                placeholder={`Share your story, philosophy, and what makes you unique as a ${config.roleLabel.toLowerCase()}...`}
                placeholderTextColor={COLORS.textLight}
                value={moreAboutMe}
                onChangeText={(text) => setMoreAboutMe(text.slice(0, MAX_BIO_LENGTH))}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{moreAboutMe.length}/{MAX_BIO_LENGTH}</Text>
            </View>
          ) : moreAboutMe ? (
            <Text style={styles.bioText}>{moreAboutMe}</Text>
          ) : (
            <Text style={styles.noBioText}>No additional information provided</Text>
          )}
        </Card>

        {/* Save Button - Shows when editing */}
        {isEditing && (
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            fullWidth
            style={{ backgroundColor: primaryColor, marginBottom: SIZES.lg }}
          />
        )}

        {/* Subscription Status */}
        <Card style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Subscription</Text>
            <TouchableOpacity onPress={() => router.push(config.routes.dashboard.replace('dashboard', 'subscription') as any)}>
              <Text style={[styles.editButton, { color: primaryColor }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.subscriptionInfo}>
            <Icon 
              name={subscriptionData?.has_pro_access ? 'checkmark-circle' : 'alert-circle'} 
              size={24} 
              color={subscriptionData?.has_pro_access ? COLORS.success : COLORS.warning} 
            />
            <Text style={styles.subscriptionText}>
              {subscriptionData?.has_pro_access 
                ? (subscriptionData?.is_trial ? 'Free Trial Active' : 'Pro Plan Active')
                : 'No Active Plan'}
            </Text>
          </View>
          {subscriptionData?.has_pro_access && subscriptionData?.days_remaining !== null && (
            <View style={styles.subscriptionDetails}>
              {/* Days Remaining Badge */}
              <View style={[styles.daysRemainingBadge, { backgroundColor: subscriptionData.is_trial ? COLORS.warning + '20' : primaryColor + '15' }]}>
                <Icon 
                  name="calendar-outline" 
                  size={16} 
                  color={subscriptionData.is_trial ? COLORS.warning : primaryColor} 
                />
                <Text style={[styles.daysRemainingText, { color: subscriptionData.is_trial ? COLORS.warning : primaryColor }]}>
                  {subscriptionData.days_remaining} days {subscriptionData.is_trial ? 'left in trial' : 'remaining'}
                </Text>
              </View>
              {/* Auto-renew Status */}
              {!subscriptionData.is_trial && (
                <View style={styles.autoRenewRow}>
                  <Icon 
                    name={subscriptionData.auto_renewing ? 'refresh-outline' : 'time-outline'} 
                    size={14} 
                    color={COLORS.textSecondary} 
                  />
                  <Text style={styles.autoRenewText}>
                    {subscriptionData.auto_renewing ? 'Auto-renews annually' : 'Expires, no auto-renew'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Feedback Card - Only for paying subscribers */}
        {subscriptionData?.has_pro_access && !subscriptionData?.is_trial && (
          <Card style={styles.profileCard}>
            <View style={styles.feedbackHeader}>
              <Icon name="chatbubble-ellipses-outline" size={22} color={primaryColor} />
              <Text style={styles.cardTitle}>Share Your Feedback</Text>
            </View>
            <Text style={styles.feedbackDescription}>
              Help us improve True Joy Birthing with your insights.
            </Text>
            <TouchableOpacity 
              style={[styles.feedbackButton, { backgroundColor: primaryColor }]}
              onPress={() => Linking.openURL('https://truejoybirthing.com/feedback/')}
              data-testid="feedback-btn"
            >
              <Icon name="star-outline" size={16} color={COLORS.white} />
              <Text style={styles.feedbackButtonText}>Leave Feedback</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Logout Button */}
        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout} 
          data-testid="logout-btn"
          accessibilityRole="button"
          accessibilityLabel="Log out of your account"
        >
          <Icon name="log-out-outline" size={20} color={COLORS.error} />
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
        
        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  
  // Header styles
  header: { alignItems: 'center', marginBottom: SIZES.lg },
  avatarContainer: { 
    width: 100, height: 100, borderRadius: 50, 
    alignItems: 'center', justifyContent: 'center', position: 'relative' 
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  cameraIconOverlay: { 
    position: 'absolute', bottom: 0, right: 0, 
    width: 32, height: 32, borderRadius: 16, 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white 
  },
  photoHint: { fontSize: SIZES.fontXs, color: COLORS.textLight, marginTop: SIZES.xs },
  userName: { fontSize: SIZES.fontXl, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginTop: SIZES.sm },
  userEmail: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  roleBadge: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, 
    borderRadius: SIZES.radiusFull, marginTop: SIZES.sm 
  },
  roleText: { fontSize: SIZES.fontSm, fontFamily: FONTS.bodyMedium, color: COLORS.white, marginLeft: 4 },
  
  // Card styles
  profileCard: { marginBottom: SIZES.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  cardTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.subheading, color: COLORS.textPrimary },
  editButton: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyMedium },
  
  // Info display styles
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.sm },
  infoText: { marginLeft: SIZES.md, flex: 1 },
  infoLabel: { fontSize: SIZES.fontXs, color: COLORS.textLight },
  infoValue: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary },
  
  // Form styles
  locationRow: { flexDirection: 'row', gap: SIZES.sm },
  cityInput: { flex: 2 },
  stateInput: { flex: 1 },
  zipLookupStatus: { flexDirection: 'row', alignItems: 'center', marginVertical: SIZES.xs },
  zipLookupText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginLeft: SIZES.xs },
  
  // Toggle styles
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SIZES.md },
  toggleLabel: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary },
  toggle: { 
    width: 50, height: 28, borderRadius: 14, 
    backgroundColor: COLORS.border, justifyContent: 'center', padding: 2 
  },
  toggleDot: { 
    width: 24, height: 24, borderRadius: 12, 
    backgroundColor: COLORS.white 
  },
  toggleDotActive: { alignSelf: 'flex-end' },
  
  // Video styles
  fieldDescription: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.md },
  videoInput: { 
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: SIZES.radiusSm, padding: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.textPrimary 
  },
  videoInputError: { borderColor: COLORS.error },
  errorText: { fontSize: SIZES.fontSm, color: COLORS.error, marginTop: SIZES.xs },
  videoPreview: { borderRadius: SIZES.radiusMd, overflow: 'hidden', position: 'relative' },
  videoThumbnail: { width: '100%', height: 180, backgroundColor: COLORS.textLight },
  playIconOverlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' 
  },
  noVideoContainer: { alignItems: 'center', paddingVertical: SIZES.lg },
  noVideoText: { fontSize: SIZES.fontMd, color: COLORS.textLight, marginTop: SIZES.sm },
  
  // Bio styles
  bioInput: { 
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: SIZES.radiusSm, padding: SIZES.md, fontSize: SIZES.fontMd, 
    color: COLORS.textPrimary, minHeight: 120, textAlignVertical: 'top' 
  },
  charCount: { fontSize: SIZES.fontXs, color: COLORS.textLight, textAlign: 'right', marginTop: SIZES.xs },
  bioText: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary, lineHeight: 22 },
  noBioText: { fontSize: SIZES.fontMd, color: COLORS.textLight, fontStyle: 'italic' },
  
  // Subscription styles
  subscriptionInfo: { flexDirection: 'row', alignItems: 'center' },
  subscriptionText: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary, marginLeft: SIZES.sm },
  subscriptionDetails: { marginTop: SIZES.sm, marginLeft: 36 },
  daysRemainingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SIZES.sm, 
    paddingVertical: SIZES.xs, 
    borderRadius: SIZES.radiusSm,
    alignSelf: 'flex-start',
  },
  daysRemainingText: { 
    fontSize: SIZES.fontSm, 
    fontFamily: FONTS.bodyMedium, 
    marginLeft: SIZES.xs 
  },
  autoRenewRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: SIZES.xs 
  },
  autoRenewText: { 
    fontSize: SIZES.fontXs, 
    fontFamily: FONTS.body, 
    color: COLORS.textSecondary, 
    marginLeft: SIZES.xs 
  },
  
  // Feedback section styles
  feedbackHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SIZES.sm, 
    marginBottom: SIZES.xs 
  },
  feedbackDescription: { 
    fontSize: SIZES.fontSm, 
    fontFamily: FONTS.body, 
    color: COLORS.textSecondary, 
    marginBottom: SIZES.sm,
    marginLeft: 30,
  },
  feedbackButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: SIZES.sm, 
    borderRadius: SIZES.radiusSm, 
    gap: SIZES.xs 
  },
  feedbackButtonText: { 
    fontSize: SIZES.fontSm, 
    fontFamily: FONTS.bodyMedium, 
    color: COLORS.white 
  },
  
  // Logout styles
  logoutButton: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: SIZES.md, marginTop: SIZES.md 
  },
  logoutText: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyMedium, color: COLORS.error, marginLeft: SIZES.sm },
  
  // Legal Links styles
  legalSection: {
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    color: COLORS.textLight,
  },
  legalSeparator: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
  },
});
