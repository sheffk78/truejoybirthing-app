import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

export default function DoulaProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [practiceName, setPracticeName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [yearsInPractice, setYearsInPractice] = useState('');
  
  const fetchProfile = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.DOULA_PROFILE);
      setProfile(data);
      setPracticeName(data.practice_name || '');
      setLocationCity(data.location_city || '');
      setLocationState(data.location_state || '');
      setYearsInPractice(data.years_in_practice?.toString() || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
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
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Icon name="person-circle-outline" size={80} color={COLORS.roleDoula} />
          </View>
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
        
        {/* Logout */}
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
    marginBottom: SIZES.sm,
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
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roleDoula,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginTop: SIZES.sm,
  },
  roleText: {
    color: COLORS.white,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
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
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editButton: {
    fontSize: SIZES.fontMd,
    color: COLORS.roleDoula,
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
  servicesCard: {
    marginBottom: SIZES.md,
  },
  servicesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.sm,
  },
  serviceTag: {
    backgroundColor: COLORS.roleDoula + '20',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginRight: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  serviceTagText: {
    color: COLORS.roleDoula,
    fontSize: SIZES.fontSm,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: SIZES.lg,
  },
});
