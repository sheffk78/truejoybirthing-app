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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { apiRequest, uploadImage } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

const MAX_BIO_LENGTH = 800;

// Helper to extract YouTube video ID
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

// Get YouTube thumbnail URL
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

export default function MidwifeProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { status: subscriptionStatus, fetchStatus: fetchSubscriptionStatus } = useSubscriptionStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Form state
  const [practiceName, setPracticeName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [yearsInPractice, setYearsInPractice] = useState('');
  const [acceptingClients, setAcceptingClients] = useState(true);
  
  // New fields (like Doula)
  const [videoIntroUrl, setVideoIntroUrl] = useState('');
  const [moreAboutMe, setMoreAboutMe] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  
  const fetchProfile = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.MIDWIFE_PROFILE);
      setProfile(data);
      setPracticeName(data.practice_name || '');
      setCredentials(data.credentials || '');
      setLocationCity(data.location_city || '');
      setLocationState(data.location_state || '');
      setYearsInPractice(data.years_in_practice?.toString() || '');
      setAcceptingClients(data.accepting_clients !== false);
      setVideoIntroUrl(data.video_intro_url || '');
      setMoreAboutMe(data.more_about_me || '');
      setProfilePicture(data.picture || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  
  useEffect(() => {
    fetchProfile();
    fetchSubscriptionStatus();
  }, []);

  // Validate YouTube URL when it changes
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
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile photo.');
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
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera to take a photo.');
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
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const imageUrl = await uploadImage(uri, 'profile');
      setProfilePicture(imageUrl);
      
      await apiRequest(API_ENDPOINTS.MIDWIFE_PROFILE, {
        method: 'PUT',
        body: { picture: imageUrl },
      });
      
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Update Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.MIDWIFE_PROFILE, {
        method: 'PUT',
        body: {
          practice_name: practiceName,
          credentials: credentials,
          location_city: locationCity,
          location_state: locationState,
          years_in_practice: yearsInPractice ? parseInt(yearsInPractice) : null,
          accepting_clients: acceptingClients,
          video_intro_url: videoIntroUrl || null,
          more_about_me: moreAboutMe || null,
        },
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
  
  const handleLogout = () => {
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
  };

  const videoId = getYouTubeVideoId(videoIntroUrl);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Profile Photo */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={showPhotoOptions}
            disabled={uploadingPhoto}
            data-testid="profile-photo-btn"
          >
            {uploadingPhoto ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color={COLORS.white} />
              </View>
            ) : profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={40} color={COLORS.white} />
              </View>
            )}
            <View style={styles.cameraIconOverlay}>
              <Icon name="camera" size={16} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change photo</Text>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Icon name="medkit" size={14} color={COLORS.white} />
            <Text style={styles.roleText}>Midwife</Text>
          </View>
        </View>
        
        {/* Profile Info */}
        <Card style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Practice Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
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
              <Input
                label="Credentials"
                placeholder="e.g., CPM, CNM, LM"
                value={credentials}
                onChangeText={setCredentials}
              />
              <View style={styles.locationRow}>
                <Input
                  label="City"
                  placeholder="City"
                  value={locationCity}
                  onChangeText={setLocationCity}
                  containerStyle={styles.cityInput}
                />
                <Input
                  label="State"
                  placeholder="State"
                  value={locationState}
                  onChangeText={setLocationState}
                  containerStyle={styles.stateInput}
                />
              </View>
              <Input
                label="Years in Practice"
                placeholder="e.g., 5"
                value={yearsInPractice}
                onChangeText={setYearsInPractice}
                keyboardType="numeric"
              />
              
              {/* Accepting Clients Toggle */}
              <TouchableOpacity 
                style={styles.toggleRow}
                onPress={() => setAcceptingClients(!acceptingClients)}
              >
                <Text style={styles.toggleLabel}>Accepting New Clients</Text>
                <View style={[styles.toggle, acceptingClients && styles.toggleActive]}>
                  <View style={[styles.toggleDot, acceptingClients && styles.toggleDotActive]} />
                </View>
              </TouchableOpacity>
              
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                fullWidth
              />
            </View>
          ) : (
            <View>
              <View style={styles.infoRow}>
                <Icon name="briefcase-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Practice Name</Text>
                  <Text style={styles.infoValue}>{profile?.practice_name || 'Not set'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="school-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Credentials</Text>
                  <Text style={styles.infoValue}>{profile?.credentials || 'Not set'}</Text>
                </View>
              </View>
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
                    {profile?.accepting_clients !== false ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Video Introduction */}
        <Card style={styles.videoCard}>
          <Text style={styles.cardTitle}>Video Introduction</Text>
          <Text style={styles.videoHint}>Add a YouTube video to introduce yourself to potential clients</Text>
          
          {isEditing ? (
            <View>
              <TextInput
                style={[styles.videoInput, videoError && styles.videoInputError]}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={COLORS.textLight}
                value={videoIntroUrl}
                onChangeText={setVideoIntroUrl}
                autoCapitalize="none"
                autoCorrect={false}
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
              <Image 
                source={{ uri: getYouTubeThumbnail(videoId) }} 
                style={styles.videoThumbnail}
              />
              <View style={styles.playIconOverlay}>
                <Icon name="play-circle" size={48} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noVideoContainer}>
              <Icon name="videocam-outline" size={32} color={COLORS.textLight} />
              <Text style={styles.noVideoText}>No video added yet</Text>
              <Text style={styles.noVideoHint}>Click Edit above to add your introduction video</Text>
            </View>
          )}
        </Card>

        {/* More About Me */}
        <Card style={styles.bioCard}>
          <Text style={styles.cardTitle}>More About Me</Text>
          <Text style={styles.bioHint}>Share more about your background, philosophy, and approach</Text>
          
          {isEditing ? (
            <View>
              <TextInput
                style={styles.bioInput}
                placeholder="Tell potential clients about yourself, your experience, and what makes your practice unique..."
                placeholderTextColor={COLORS.textLight}
                value={moreAboutMe}
                onChangeText={(text) => setMoreAboutMe(text.slice(0, MAX_BIO_LENGTH))}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {moreAboutMe.length}/{MAX_BIO_LENGTH}
              </Text>
            </View>
          ) : moreAboutMe ? (
            <Text style={styles.bioText}>{moreAboutMe}</Text>
          ) : (
            <View style={styles.noBioContainer}>
              <Icon name="document-text-outline" size={32} color={COLORS.textLight} />
              <Text style={styles.noBioText}>No bio added yet</Text>
              <Text style={styles.noBioHint}>Click Edit above to add information about yourself</Text>
            </View>
          )}
        </Card>

        {/* Birth Settings Served */}
        {profile?.birth_settings_served?.length > 0 && (
          <Card style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Birth Settings Served</Text>
            <View style={styles.settingsTags}>
              {profile.birth_settings_served.map((setting: string) => (
                <View key={setting} style={styles.settingTag}>
                  <Text style={styles.settingTagText}>{setting}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}
        
        {/* Subscription */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/plans-pricing')}
        >
          <Card style={[styles.menuCard, subscriptionStatus?.has_pro_access && styles.proActiveCard]}>
            <View style={styles.menuRow}>
              <Icon 
                name={subscriptionStatus?.has_pro_access ? 'star' : 'diamond-outline'} 
                size={24} 
                color={subscriptionStatus?.has_pro_access ? '#f59e0b' : COLORS.secondary} 
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuText}>
                  {subscriptionStatus?.has_pro_access 
                    ? subscriptionStatus.is_trial 
                      ? 'True Joy Pro (Trial)' 
                      : 'True Joy Pro' 
                    : 'Upgrade to Pro'
                  }
                </Text>
                <Text style={styles.subscriptionSubtext}>
                  {subscriptionStatus?.has_pro_access 
                    ? subscriptionStatus.is_trial 
                      ? `${subscriptionStatus.days_remaining} days remaining` 
                      : `${subscriptionStatus.plan_type === 'annual' ? 'Annual' : 'Monthly'} plan`
                    : 'Unlock all professional features'
                  }
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* Send Feedback - Only for Pro users */}
        {subscriptionStatus?.has_pro_access && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push('/pro-feedback')}
          >
            <Card style={styles.menuCard}>
              <View style={styles.menuRow}>
                <Icon name="chatbubble-ellipses-outline" size={24} color={COLORS.secondary} />
                <Text style={styles.menuText}>Send Feedback</Text>
                <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
        
        {/* App Tutorial */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/tutorial?role=MIDWIFE')}
        >
          <Card style={styles.menuCard}>
            <View style={styles.menuRow}>
              <Icon name="help-circle-outline" size={24} color={COLORS.accent} />
              <Text style={styles.menuText}>View App Tour</Text>
              <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
            </View>
          </Card>
        </TouchableOpacity>
        
        <Button
          title="Log Out"
          onPress={handleLogout}
          variant="outline"
          fullWidth
          style={styles.logoutButton}
        />
      </ScrollView>
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
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SIZES.xs,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.roleMidwife,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.roleMidwife,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.roleMidwife,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  photoHint: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    marginBottom: SIZES.sm,
  },
  userName: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roleMidwife,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginTop: SIZES.sm,
  },
  roleText: {
    color: COLORS.white,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    marginLeft: SIZES.xs,
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
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  editButton: {
    fontSize: SIZES.fontMd,
    color: COLORS.roleMidwife,
    fontFamily: FONTS.bodyMedium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoText: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    marginBottom: SIZES.md,
  },
  toggleLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.roleMidwife,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  videoCard: {
    marginBottom: SIZES.md,
  },
  videoHint: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    marginBottom: SIZES.md,
  },
  videoInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  videoInputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.error,
    marginTop: SIZES.xs,
  },
  videoPreview: {
    position: 'relative',
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: SIZES.radiusSm,
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  noVideoContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
  },
  noVideoText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
  },
  noVideoHint: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginTop: SIZES.xs,
  },
  bioCard: {
    marginBottom: SIZES.md,
  },
  bioHint: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    marginBottom: SIZES.md,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    minHeight: 120,
  },
  charCount: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: SIZES.xs,
  },
  bioText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  noBioContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
  },
  noBioText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
  },
  noBioHint: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginTop: SIZES.xs,
  },
  settingsCard: {
    marginBottom: SIZES.md,
  },
  settingsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.sm,
  },
  settingTag: {
    backgroundColor: COLORS.roleMidwife + '20',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginRight: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  settingTagText: {
    color: COLORS.roleMidwife,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  logoutButton: {
    marginTop: SIZES.lg,
  },
  menuCard: {
    marginBottom: SIZES.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    marginLeft: SIZES.md,
  },
  proActiveCard: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  subscriptionSubtext: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
