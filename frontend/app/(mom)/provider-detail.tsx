import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

interface ProviderProfile {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  picture?: string;
  profile?: {
    practice_name?: string;
    location_city?: string;
    location_state?: string;
    years_in_practice?: number;
    bio?: string;
    credentials?: string;
    services_offered?: string[];
    birth_settings_served?: string[];
    phone?: string;
    website?: string;
  };
}

export default function ProviderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ providerId: string }>();
  const providerId = params.providerId;
  
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderDetails();
  }, [providerId]);

  const fetchProviderDetails = async () => {
    if (!providerId) {
      setError('Provider ID not provided');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await apiRequest(`/marketplace/provider/${providerId}`);
      // API returns {user, profile, clients_served}
      if (data.user) {
        setProvider({
          user_id: data.user.user_id,
          full_name: data.user.full_name,
          email: data.user.email,
          role: data.user.role,
          picture: data.user.picture,
          profile: data.profile,
        });
        setError(null);
      } else {
        setError('Provider not found');
      }
    } catch (err: any) {
      console.error('Error fetching provider:', err);
      setError(err.message || 'Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'DOULA' ? COLORS.roleDoula : COLORS.roleMidwife;
  };

  const getRoleIcon = (role: string) => {
    return role === 'DOULA' ? 'heart' : 'medkit';
  };

  const handleMessage = () => {
    if (provider) {
      router.push(`/(mom)/messages?providerId=${provider.user_id}&providerName=${encodeURIComponent(provider.full_name)}`);
    }
  };

  const handleSchedule = () => {
    if (provider) {
      router.push(`/(mom)/appointments?providerId=${provider.user_id}&providerName=${encodeURIComponent(provider.full_name)}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !provider) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error || 'Provider not found'}</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: SIZES.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  const roleColor = getRoleColor(provider.role);
  const profile = provider.profile || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: roleColor + '20' }]}>
            {provider.picture ? (
              <Image source={{ uri: provider.picture }} style={styles.avatar} />
            ) : (
              <Icon name={getRoleIcon(provider.role)} size={48} color={roleColor} />
            )}
          </View>
          <Text style={styles.providerName}>{provider.full_name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleText}>{provider.role}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <Icon name="chatbubble-outline" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleSchedule}>
            <Icon name="calendar-outline" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <Card style={styles.detailsCard}>
          {profile.practice_name && (
            <View style={styles.detailRow}>
              <Icon name="business-outline" size={20} color={COLORS.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Practice</Text>
                <Text style={styles.detailValue}>{profile.practice_name}</Text>
              </View>
            </View>
          )}

          {(profile.location_city || profile.location_state) && (
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={20} color={COLORS.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {[profile.location_city, profile.location_state].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          )}

          {profile.years_in_practice && (
            <View style={styles.detailRow}>
              <Icon name="time-outline" size={20} color={COLORS.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{profile.years_in_practice} years</Text>
              </View>
            </View>
          )}

          {profile.credentials && (
            <View style={styles.detailRow}>
              <Icon name="ribbon-outline" size={20} color={COLORS.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Credentials</Text>
                <Text style={styles.detailValue}>{profile.credentials}</Text>
              </View>
            </View>
          )}

          {profile.phone && (
            <View style={styles.detailRow}>
              <Icon name="call-outline" size={20} color={COLORS.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{profile.phone}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Bio */}
        {profile.bio && (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </Card>
        )}

        {/* Services */}
        {profile.services_offered && profile.services_offered.length > 0 && (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <View style={styles.tagsContainer}>
              {profile.services_offered.map((service: string) => (
                <View key={service} style={[styles.tag, { backgroundColor: roleColor + '15' }]}>
                  <Text style={[styles.tagText, { color: roleColor }]}>{service}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Birth Settings */}
        {profile.birth_settings_served && profile.birth_settings_served.length > 0 && (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Birth Settings</Text>
            <View style={styles.tagsContainer}>
              {profile.birth_settings_served.map((setting: string) => (
                <View key={setting} style={[styles.tag, { backgroundColor: roleColor + '15' }]}>
                  <Text style={[styles.tagText, { color: roleColor }]}>{setting}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <View style={{ height: SIZES.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.xl,
  },
  errorText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
  content: {
    flex: 1,
    padding: SIZES.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  providerName: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  roleBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.sm,
  },
  roleText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  actionButton: {
    alignItems: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    marginTop: SIZES.xs,
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  detailsCard: {
    marginBottom: SIZES.md,
    padding: SIZES.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailContent: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  detailLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  bioText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  tag: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.sm,
  },
  tagText: {
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
});
