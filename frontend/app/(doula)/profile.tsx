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

const MAX_BIO_LENGTH = 800; // ~2 paragraphs

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

export default function DoulaProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { status: subscriptionStatus, fetchStatus: fetchSubscriptionStatus } = useSubscriptionStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Form state
  const [practiceName, setPracticeName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [yearsInPractice, setYearsInPractice] = useState('');
  const [lookingUpZip, setLookingUpZip] = useState(false);
  
  // New fields
  const [videoIntroUrl, setVideoIntroUrl] = useState('');
  const [moreAboutMe, setMoreAboutMe] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  
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
        setLocationCity('');
        setLocationState('');
      } finally {
        setLookingUpZip(false);
      }
    }
  };
  
  const fetchProfile = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.DOULA_PROFILE);
      setProfile(data);
      setPracticeName(data.practice_name || '');
      setLocationCity(data.location_city || '');
      setLocationState(data.location_state || '');
      setYearsInPractice(data.years_in_practice?.toString() || '');
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
      // Request permissions
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
      
      // Save to backend
      await apiRequest(API_ENDPOINTS.DOULA_PROFILE, {
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
      await apiRequest(API_ENDPOINTS.DOULA_PROFILE, {
        method: 'PUT',
        body: {
          practice_name: practiceName,
          location_city: locationCity,
          location_state: locationState,
          years_in_practice: yearsInPractice ? parseInt(yearsInPractice) : null,
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
            <Icon name="heart" size={14} color={COLORS.white} />
            <Text style={styles.roleText}>Doula</Text>
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
                label="Zip Code"
                placeholder="Enter 5-digit zip code"
                value={zipCode}
                onChangeText={handleZipChange}
                keyboardType="number-pad"
                maxLength={5}
              />
              {lookingUpZip && (
                <View style={styles.zipLookupStatus}>
                  <ActivityIndicator size="small" color={COLORS.roleDoula} />
                  <Text style={styles.zipLookupText}>Looking up location...</Text>
                </View>
              )}
              <View style={styles.locationRow}>
                <Input
                  label="City"
                  placeholder="City"
                  value={locationCity}
                  onChangeText={setLocationCity}
                  containerStyle={styles.cityInput}
                  editable={false}
                />
                <Input
                  label="State"
                  placeholder="State"
                  value={locationState}
                  onChangeText={setLocationState}
                  containerStyle={styles.stateInput}
                  editable={false}
                />
              </View>
              <Input
                label="Years in Practice"
                placeholder="e.g., 5"
                value={yearsInPractice}
                onChangeText={setYearsInPractice}
                keyboardType="number-pad"
              />
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
                    {profile?.accepting_new_clients ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Video Introduction */}
        <Card style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Video Introduction</Text>
          </View>
          <Text style={styles.fieldDescription}>
            Add a YouTube video to introduce yourself to potential clients
          </Text>
          <Input
            label=""
            placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
            value={videoIntroUrl}
            onChangeText={setVideoIntroUrl}
            autoCapitalize="none"
          />
          {videoIntroUrl && (
            <View style={styles.videoPreview}>
              {videoId ? (
                <TouchableOpacity 
                  style={styles.thumbnailContainer}
                  onPress={() => {/* Could open video player */}}
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
                <View style={styles.videoErrorContainer}>
                  <Icon name="close-circle" size={32} color={COLORS.error} />
                  <Text style={styles.videoErrorText}>Invalid YouTube URL</Text>
                </View>
              )}
            </View>
          )}
          {videoIntroUrl !== profile?.video_intro_url && (
            <Button
              title="Save Video"
              onPress={handleSave}
              loading={saving}
              fullWidth
              style={{ marginTop: SIZES.sm }}
            />
          )}
        </Card>

        {/* More About Me */}
        <Card style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>More About Me</Text>
          </View>
          <Text style={styles.fieldDescription}>
            Tell potential clients more about yourself and your approach
          </Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Share your story, philosophy, and what makes you unique as a doula..."
            placeholderTextColor={COLORS.textLight}
            value={moreAboutMe}
            onChangeText={(text) => setMoreAboutMe(text.slice(0, MAX_BIO_LENGTH))}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            data-testid="more-about-me-input"
          />
          <Text style={styles.charCount}>
            {moreAboutMe.length}/{MAX_BIO_LENGTH} characters
          </Text>
          {moreAboutMe !== profile?.more_about_me && (
            <Button
              title="Save Bio"
              onPress={handleSave}
              loading={saving}
              fullWidth
              style={{ marginTop: SIZES.sm }}
            />
          )}
        </Card>
        
        {/* Services */}
        {profile?.services_offered?.length > 0 && (
          <Card style={styles.servicesCard}>
            <Text style={styles.cardTitle}>Services Offered</Text>
            <View style={styles.servicesTags}>
              {profile.services_offered.map((service: string) => (
                <View key={service} style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{service}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}
        
        {/* Subscription Status */}
        <Card style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Icon 
              name={subscriptionStatus?.is_active ? 'star' : 'star-outline'} 
              size={24} 
              color={subscriptionStatus?.is_active ? COLORS.accent : COLORS.textSecondary} 
            />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionTitle}>
                {subscriptionStatus?.is_active ? 'Pro Subscription' : 'Free Plan'}
              </Text>
              <Text style={styles.subscriptionSubtitle}>
                {subscriptionStatus?.is_active 
                  ? subscriptionStatus.is_trial 
                    ? `Trial ends ${new Date(subscriptionStatus.trial_end).toLocaleDateString()}`
                    : 'Full access to all features'
                  : 'Limited features'}
              </Text>
            </View>
          </View>
          {!subscriptionStatus?.is_active && (
            <Button
              title="Upgrade to Pro"
              onPress={() => router.push('/(doula)/subscription')}
              fullWidth
              style={{ marginTop: SIZES.md }}
            />
          )}
        </Card>
        
        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Icon name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Logout</Text>
          </TouchableOpacity>
        </View>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.roleDoula,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xs,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.roleDoula,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.textPrimary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  photoHint: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  userName: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginTop: SIZES.sm,
  },
  userEmail: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roleDoula,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginTop: SIZES.sm,
    gap: 6,
  },
  roleText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.white,
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
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  editButton: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.roleDoula,
  },
  fieldDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  locationRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  cityInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  zipLookupStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
    gap: SIZES.xs,
  },
  zipLookupText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
  },
  // Video Introduction styles
  videoPreview: {
    marginTop: SIZES.sm,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '10',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    gap: SIZES.sm,
  },
  videoErrorText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.error,
  },
  // More About Me styles
  bioInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  charCount: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SIZES.xs,
  },
  servicesCard: {
    marginBottom: SIZES.md,
  },
  servicesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginTop: SIZES.sm,
  },
  serviceTag: {
    backgroundColor: COLORS.roleDoula + '20',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  serviceTagText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.roleDoula,
  },
  subscriptionCard: {
    marginBottom: SIZES.md,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionInfo: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  subscriptionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actions: {
    marginTop: SIZES.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
  },
  actionButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
  },
});
