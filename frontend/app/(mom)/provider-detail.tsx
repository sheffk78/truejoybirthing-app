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
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F } from '../../src/constants/designRefresh';

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
  const colors = useColors();
  const styles = getStyles(colors);
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
    return role === 'DOULA' ? C.lavender : role === 'MIDWIFE' ? C.lavender : role === 'LACTATION' ? C.rose : C.lavender;
  };

  const getRoleIcon = (role: string) => {
    return role === 'DOULA' ? 'heart' : role === 'MIDWIFE' ? 'medkit' : role === 'LACTATION' ? 'water' : 'person';
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
          <TouchableOpacity onPress={() => { router.canGoBack() ? router.back() : router.replace('/'); }} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !provider) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { router.canGoBack() ? router.back() : router.replace('/'); }} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error || 'Provider not found'}</Text>
          <Button title="Go Back" onPress={() => { router.canGoBack() ? router.back() : router.replace('/'); }} style={{ marginTop: SIZES.lg }} />
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
        <TouchableOpacity onPress={() => { router.canGoBack() ? router.back() : router.replace('/'); }} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
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
          <TouchableOpacity style={[styles.actionButton, styles.actionPrimary]} onPress={handleMessage}>
            <Icon name="chatbubble-outline" size={22} color={C.white} />
            <Text style={[styles.actionText, styles.actionTextPrimary]}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleSchedule}>
            <Icon name="calendar-outline" size={22} color={C.lavender} />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <Card style={styles.detailsCard}>
          {profile.practice_name && (
            <View style={styles.detailRow}>
              <Icon name="business-outline" size={20} color={colors.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Practice</Text>
                <Text style={styles.detailValue}>{profile.practice_name}</Text>
              </View>
            </View>
          )}

          {(profile.location_city || profile.location_state) && (
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={20} color={colors.textSecondary} />
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
              <Icon name="time-outline" size={20} color={colors.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{profile.years_in_practice} years</Text>
              </View>
            </View>
          )}

          {profile.credentials && (
            <View style={styles.detailRow}>
              <Icon name="ribbon-outline" size={20} color={colors.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Credentials</Text>
                <Text style={styles.detailValue}>{profile.credentials}</Text>
              </View>
            </View>
          )}

          {profile.phone && (
            <View style={styles.detailRow}>
              <Icon name="call-outline" size={20} color={colors.textSecondary} />
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
                <View key={service} style={[styles.tag, { backgroundColor: roleColor === C.rose ? C.roseBg : C.lavenderBorder }]}>
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
                <View key={setting} style={[styles.tag, { backgroundColor: roleColor === C.rose ? C.roseBg : C.lavenderBorder }]}>
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

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
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
    color: colors.text,
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
    color: colors.textSecondary,
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
    backgroundColor: C.lavenderBorder,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  providerName: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: F.serif,
    color: C.ink,
    marginBottom: SIZES.xs,
  },
  roleBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: C.lavenderBorder,
  },
  roleText: {
    color: C.lavender,
    fontSize: SIZES.xs,
    fontFamily: F.uiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.lavenderBorder,
    minWidth: 120,
  },
  actionPrimary: {
    backgroundColor: C.lavenderSoft,
    borderColor: C.lavenderSoft,
  },
  actionText: {
    marginTop: SIZES.xs,
    fontSize: SIZES.sm,
    fontFamily: F.uiSemi,
    color: C.lavender,
  },
  actionTextPrimary: {
    color: C.white,
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
    borderBottomColor: colors.border,
  },
  detailContent: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: F.uiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.gray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: SIZES.md,
    fontFamily: F.ui,
    color: C.ink,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontFamily: F.serifSemi,
    color: C.ink,
    marginBottom: SIZES.sm,
  },
  bioText: {
    fontSize: SIZES.md,
    fontFamily: F.ui,
    color: C.body,
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
}));
