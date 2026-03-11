import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

interface Provider {
  user_id: string;
  full_name: string;
  email: string;
  role: 'DOULA' | 'MIDWIFE';
  picture?: string;
  profile?: any;
  already_shared: boolean;
  share_status?: string;
}

interface ShareRequest {
  request_id: string;
  provider_id: string;
  provider_name: string;
  provider_role: string;
  status: string;
  created_at: string;
  responded_at?: string;
}

export default function ShareBirthPlanScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Provider[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const fetchShareRequests = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.BIRTH_PLAN_SHARE_REQUESTS);
      setShareRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching share requests:', error);
    }
  };

  useEffect(() => {
    fetchShareRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShareRequests();
    setRefreshing(false);
  };

  const searchProviders = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await apiRequest(`${API_ENDPOINTS.PROVIDERS_SEARCH}?query=${encodeURIComponent(query)}`);
      setSearchResults(data.providers || []);
    } catch (error) {
      console.error('Error searching providers:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProviders(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProviders]);

  const sendShareRequest = async (providerId: string) => {
    setSending(providerId);
    try {
      await apiRequest(API_ENDPOINTS.BIRTH_PLAN_SHARE, {
        method: 'POST',
        body: { provider_id: providerId },
      });
      Alert.alert('Success', 'Share request sent! They will be notified.');
      await fetchShareRequests();
      // Clear search to refresh results
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send share request');
    } finally {
      setSending(null);
    }
  };

  const revokeShare = async (requestId: string, providerName: string) => {
    Alert.alert(
      'Revoke Access',
      `Are you sure you want to revoke ${providerName}'s access to your birth plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.BIRTH_PLAN_SHARE}/${requestId}`, {
                method: 'DELETE',
              });
              Alert.alert('Success', 'Access revoked');
              await fetchShareRequests();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke access');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'rejected': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const acceptedRequests = shareRequests.filter(r => r.status === 'accepted');
  const pendingRequests = shareRequests.filter(r => r.status === 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Share Birth Plan</Text>
        </View>

        <Text style={styles.subtitle}>
          Share your birth plan with your doula or midwife so they can review and add notes.
        </Text>

        {/* Search Section */}
        <Card style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Find Provider</Text>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              data-testid="search-provider-input"
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.map((provider) => (
                <View key={provider.user_id} style={styles.providerRow}>
                  <View style={styles.providerAvatar}>
                    <Icon 
                      name={provider.role === 'DOULA' ? 'people' : 'medkit'} 
                      size={20} 
                      color={colors.white} 
                    />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{provider.full_name}</Text>
                    <Text style={styles.providerRole}>{provider.role}</Text>
                    <Text style={styles.providerEmail}>{provider.email}</Text>
                  </View>
                  {provider.already_shared ? (
                    <View style={styles.sharedBadge}>
                      <Text style={styles.sharedBadgeText}>
                        {provider.share_status === 'accepted' ? 'Shared' : 'Pending'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => sendShareRequest(provider.user_id)}
                      disabled={sending === provider.user_id}
                      data-testid={`share-btn-${provider.user_id}`}
                    >
                      {sending === provider.user_id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <>
                          <Icon name="share-social" size={16} color={colors.white} />
                          <Text style={styles.shareButtonText}>Share</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <Text style={styles.noResults}>No providers found matching "{searchQuery}"</Text>
          )}
        </Card>

        {/* Active Shares */}
        {acceptedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Shares</Text>
            <Text style={styles.sectionSubtitle}>
              These providers can view your birth plan and add notes
            </Text>
            {acceptedRequests.map((request) => (
              <Card key={request.request_id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  <View style={styles.requestIcon}>
                    <Icon 
                      name={request.provider_role === 'DOULA' ? 'people' : 'medkit'} 
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.provider_name}</Text>
                    <View style={styles.statusRow}>
                      <Icon 
                        name={getStatusIcon(request.status)} 
                        size={14} 
                        color={getStatusColor(request.status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() => revokeShare(request.request_id, request.provider_name)}
                    data-testid={`revoke-btn-${request.request_id}`}
                  >
                    <Text style={styles.revokeButtonText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            <Text style={styles.sectionSubtitle}>
              Waiting for provider to accept
            </Text>
            {pendingRequests.map((request) => (
              <Card key={request.request_id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  <View style={[styles.requestIcon, { backgroundColor: colors.warning + '20' }]}>
                    <Icon 
                      name={request.provider_role === 'DOULA' ? 'people' : 'medkit'} 
                      size={20} 
                      color={colors.warning} 
                    />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.provider_name}</Text>
                    <View style={styles.statusRow}>
                      <Icon name="time" size={14} color={colors.warning} />
                      <Text style={[styles.statusText, { color: colors.warning }]}>
                        Pending
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.revokeButton, { backgroundColor: colors.textLight + '20' }]}
                    onPress={() => revokeShare(request.request_id, request.provider_name)}
                  >
                    <Text style={[styles.revokeButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Empty State */}
        {shareRequests.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="share-social" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Active Shares</Text>
            <Text style={styles.emptyText}>
              Search for your doula or midwife above to share your birth plan with them.
            </Text>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  backButton: {
    marginRight: SIZES.md,
    padding: SIZES.xs,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: colors.textSecondary,
    marginBottom: SIZES.lg,
    lineHeight: 22,
  },
  searchCard: {
    marginBottom: SIZES.lg,
    padding: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SIZES.sm,
  },
  sectionSubtitle: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
    marginBottom: SIZES.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: colors.text,
    paddingVertical: SIZES.xs,
  },
  resultsContainer: {
    marginTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SIZES.md,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  providerName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.text,
  },
  providerRole: {
    fontSize: SIZES.fontSm,
    color: colors.primary,
    fontWeight: '500',
  },
  providerEmail: {
    fontSize: SIZES.fontSm,
    color: colors.textLight,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    gap: 4,
  },
  shareButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: SIZES.fontSm,
  },
  sharedBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusMd,
  },
  sharedBadgeText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: SIZES.fontSm,
  },
  noResults: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: SIZES.md,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: SIZES.lg,
  },
  requestCard: {
    marginBottom: SIZES.sm,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  requestName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: SIZES.fontSm,
    marginLeft: 4,
  },
  revokeButton: {
    backgroundColor: colors.error + '15',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  revokeButtonText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: SIZES.fontSm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.sm,
    paddingHorizontal: SIZES.xl,
  },
}));
