import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

export default function MomProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [team, setTeam] = useState<any>({ doula: null, midwife: null });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lookingUpZip, setLookingUpZip] = useState(false);
  
  const [dueDate, setDueDate] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  
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
      
      // Set form values
      setDueDate(profileData.due_date || '');
      setZipCode(profileData.zip_code || '');
      setLocationCity(profileData.location_city || '');
      setLocationState(profileData.location_state || '');
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

  // Format due date for display
  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
      const date = new Date(dateStr);
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
      const data = await apiRequest(`/zip-lookup/${zip}`);
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
    if (numericZip.length === 5) {
      lookupZipCode(numericZip);
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

  const pickImage = async () => {
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
      
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} data-testid="avatar-button">
            {uploadingPhoto ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={40} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Icon name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.tapToEdit}>Tap photo to update</Text>
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
              <Input
                label="Due Date"
                placeholder="YYYY-MM-DD"
                value={dueDate}
                onChangeText={setDueDate}
                leftIcon="calendar-outline"
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
                label="Planned Birth Setting"
                placeholder="Home, Hospital, Birth Center"
                value={plannedBirthSetting}
                onChangeText={setPlannedBirthSetting}
                leftIcon="medical-outline"
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
                <Icon name="calendar-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Due Date</Text>
                  <Text style={styles.infoValue}>{profile?.due_date || 'Not set'}</Text>
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
                <Icon name="medical-outline" size={20} color={COLORS.textSecondary} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Birth Setting</Text>
                  <Text style={styles.infoValue}>{profile?.planned_birth_setting || 'Not set'}</Text>
                </View>
              </View>
            </View>
          )}
        </Card>
        
        {/* My Team */}
        <Card style={styles.teamCard}>
          <Text style={styles.cardTitle}>My Team</Text>
          
          {/* Doula */}
          <View style={styles.teamMember}>
            <View style={styles.teamIcon}>
              <Icon name="heart" size={24} color={COLORS.roleDoula} />
            </View>
            <View style={styles.teamInfo}>
              <Text style={styles.teamRole}>Doula</Text>
              {team.doula ? (
                <Text style={styles.teamName}>{team.doula.name}</Text>
              ) : (
                <Text style={styles.teamEmpty}>Not connected</Text>
              )}
            </View>
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectText}>
                {team.doula ? 'View' : 'Find'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Midwife */}
          <View style={styles.teamMember}>
            <View style={styles.teamIcon}>
              <Icon name="medkit" size={24} color={COLORS.roleMidwife} />
            </View>
            <View style={styles.teamInfo}>
              <Text style={styles.teamRole}>Midwife</Text>
              {team.midwife ? (
                <Text style={styles.teamName}>{team.midwife.name}</Text>
              ) : (
                <Text style={styles.teamEmpty}>Not connected</Text>
              )}
            </View>
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectText}>
                {team.midwife ? 'View' : 'Find'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        {/* Postpartum */}
        <TouchableOpacity activeOpacity={0.8}>
          <Card style={styles.menuCard}>
            <View style={styles.menuRow}>
              <Icon name="moon-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuText}>Postpartum Plan</Text>
              <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* App Tutorial */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/tutorial?role=MOM')}
        >
          <Card style={styles.menuCard}>
            <View style={styles.menuRow}>
              <Icon name="help-circle-outline" size={24} color={COLORS.accent} />
              <Text style={styles.menuText}>View App Tour</Text>
              <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Card style={styles.logoutCard}>
            <View style={styles.menuRow}>
              <Icon name="log-out-outline" size={24} color={COLORS.error} />
              <Text style={styles.logoutText}>Log Out</Text>
              <Icon name="chevron-forward" size={20} color={COLORS.error} />
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
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
    marginBottom: SIZES.sm,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: SIZES.fontXl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tapToEdit: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
    marginTop: 4,
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
    color: COLORS.textPrimary,
  },
  editButton: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '500',
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
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
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
    borderBottomColor: COLORS.border,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamRole: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  teamName: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  teamEmpty: {
    fontSize: SIZES.fontMd,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  connectButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.primaryLight + '30',
  },
  connectText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
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
    color: COLORS.textPrimary,
  },
  logoutCard: {
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
    borderColor: COLORS.error + '30',
    borderWidth: 1,
  },
  logoutText: {
    flex: 1,
    marginLeft: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.error,
    fontFamily: FONTS.bodyBold,
  },
});
