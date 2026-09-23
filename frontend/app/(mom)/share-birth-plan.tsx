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
  Image,
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
import { C, F, kickerStyle, initialsOf } from '../../src/constants/corpus';

const DF = F;

interface Provider {
  user_id: string;
  full_name: string;
  email: string;
  role: 'DOULA' | 'MIDWIFE' | 'LACTATION';
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
  picture?: string;
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
      case 'accepted': return C.sage;
      case 'pending': return C.rose;
      case 'rejected': return C.rose;
      default: return C.grayLight;
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { router.canGoBack() ? router.back() : router.replace('/'); }} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.overline}>Your Plan</Text>
            <Text style={styles.title}>Share <Text style={styles.titleAccent}>Birth Plan</Text></Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.subtitle}>
          Share your birth plan with your doula, midwife, or lactation consultant so they can review and add notes.
        </Text>

        {/* Search Section */}
        <Card style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Find provider</Text>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={C.grayLight} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email..."
              placeholderTextColor={C.grayLight}
              autoCapitalize="none"
              autoCorrect={false}
              data-testid="search-provider-input"
            />
            {searching && <ActivityIndicator size="small" color={C.lavender} />}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.map((provider) => (
                <View key={provider.user_id} style={styles.providerRow}>
                  {provider.picture ? (
                    <Image source={{ uri: provider.picture }} style={styles.providerAvatarImg} />
                  ) : (
                    <View style={styles.providerAvatar}>
                      <Text style={styles.providerAvatarText}>{initialsOf(provider.full_name, '?')}</Text>
                    </View>
                  )}
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
                        <ActivityIndicator size="small" color={C.white} />
                      ) : (
                        <>
                          <Icon name="share" size={16} color={C.white} />
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
            <Text style={styles.sectionTitle}>Active shares</Text>
            <Text style={styles.sectionSubtitle}>
              These providers can view your birth plan and add notes
            </Text>
            {acceptedRequests.map((request) => (
              <Card key={request.request_id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  {request.picture ? (
                    <Image source={{ uri: request.picture }} style={styles.requestAvatarImg} />
                  ) : (
                    <View style={styles.requestIcon}>
                      <Text style={styles.requestIconText}>{initialsOf(request.provider_name, '?')}</Text>
                    </View>
                  )}
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
            <Text style={styles.sectionTitle}>Pending requests</Text>
            <Text style={styles.sectionSubtitle}>
              Waiting for provider to accept
            </Text>
            {pendingRequests.map((request) => (
              <Card key={request.request_id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  {request.picture ? (
                    <Image source={{ uri: request.picture }} style={styles.requestAvatarImg} />
                  ) : (
                    <View style={styles.requestIconPending}>
                      <Text style={styles.requestIconTextPending}>{initialsOf(request.provider_name, '?')}</Text>
                    </View>
                  )}
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.provider_name}</Text>
                    <View style={styles.statusRow}>
                      <Icon name="time" size={14} color={C.rose} />
                      <Text style={[styles.statusText, { color: C.rose }]}>
                        Pending
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelShareButton}
                    onPress={() => revokeShare(request.request_id, request.provider_name)}
                  >
                    <Text style={styles.cancelShareButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Empty State */}
        {shareRequests.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyChip}>
              <Icon name="share" size={44} color={C.grayLight} />
            </View>
            <Text style={styles.emptyTitle}>No active shares</Text>
            <Text style={styles.emptyText}>
              Search for your doula, midwife, or lactation consultant above to share your birth plan with them.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: C.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: SIZES.xxl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backButton: { padding: SIZES.xs, marginRight: 8 },
  headerText: { flex: 1 },
  headerSpacer: { width: 40 },
  overline: { ...kickerStyle(C.rose), marginBottom: 3 },
  title: { fontFamily: DF.serif, fontWeight: '700', fontSize: 26, lineHeight: 30, color: C.ink },
  titleAccent: { color: C.roseSoft },
  subtitle: { fontSize: 12.5, fontFamily: DF.ui, color: C.gray, lineHeight: 19, marginTop: 2, marginBottom: SIZES.lg },
  searchCard: { marginBottom: SIZES.lg, padding: SIZES.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18 },
  sectionTitle: { fontFamily: DF.serifSemi, fontWeight: '600', fontSize: 17, color: C.ink, marginBottom: SIZES.sm },
  sectionSubtitle: { fontSize: 11.5, fontFamily: DF.ui, color: C.gray, marginBottom: SIZES.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: 13.5,
    fontFamily: DF.ui,
    color: C.ink,
    paddingVertical: SIZES.xs,
  },
  resultsContainer: {
    marginTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingTop: SIZES.md,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    gap: 12,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  providerAvatarText: { color: C.white, fontWeight: '700', fontFamily: DF.uiBold, fontSize: 15 },
  providerInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  providerName: { fontSize: 13.5, fontFamily: DF.uiSemi, fontWeight: '600', color: C.ink },
  providerRole: {
    fontSize: 9.5,
    letterSpacing: 0.6,
    fontWeight: '700',
    fontFamily: DF.uiBold,
    color: C.lavender,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  providerEmail: { fontSize: 11.5, fontFamily: DF.ui, color: C.grayLight, marginTop: 1 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.lavender,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 4,
  },
  shareButtonText: { color: C.white, fontWeight: '600', fontFamily: DF.uiSemi, fontSize: 12.5 },
  sharedBadge: {
    backgroundColor: C.sageBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sharedBadgeText: { color: C.sage, fontWeight: '700', fontFamily: DF.uiBold, fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  noResults: {
    textAlign: 'center',
    color: C.grayLight,
    fontFamily: DF.ui,
    fontSize: 13,
    marginTop: SIZES.md,
    fontStyle: 'italic',
  },
  section: { marginBottom: SIZES.lg },
  requestCard: { marginBottom: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.lavenderBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestIconPending: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  requestIconText: { color: C.lavender, fontWeight: '700', fontFamily: DF.uiBold, fontSize: 15 },
  requestIconTextPending: { color: C.rose, fontWeight: '700', fontFamily: DF.uiBold, fontSize: 15 },
  requestInfo: {
    flex: 1,
    minWidth: 0,
  },
  requestName: { fontSize: 13.5, fontFamily: DF.uiSemi, fontWeight: '600', color: C.ink, marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 11.5, fontFamily: DF.ui, fontWeight: '600' },
  revokeButton: {
    backgroundColor: C.roseBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  revokeButtonText: { color: C.rose, fontWeight: '700', fontFamily: DF.uiBold, fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  cancelShareButton: {
    backgroundColor: C.track,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  cancelShareButtonText: { color: C.gray, fontWeight: '700', fontFamily: DF.uiBold, fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxl,
  },
  emptyChip: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: DF.serif, fontWeight: '700', fontSize: 21, color: C.ink, marginTop: SIZES.md },
  emptyText: {
    fontSize: 12.5,
    fontFamily: DF.ui,
    color: C.gray,
    textAlign: 'center',
    marginTop: SIZES.sm,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
}));