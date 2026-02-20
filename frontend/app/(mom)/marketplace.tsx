import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { COLORS, SIZES, SHADOWS, FONTS } from '../../src/constants/theme';
import { API_ENDPOINTS } from '../../src/constants/api';

const PROVIDER_TYPES = ['All', 'DOULA', 'MIDWIFE'];

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

export default function MarketplaceScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('All');
  const [searchCity, setSearchCity] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [contactingProvider, setContactingProvider] = useState(false);
  const [addingToTeam, setAddingToTeam] = useState(false);
  const [teamStatus, setTeamStatus] = useState<Record<string, string>>({}); // Track share status per provider
  
  const fetchProviders = async () => {
    try {
      let endpoint = '/marketplace/providers?';
      const params = [];
      
      if (selectedType !== 'All') {
        params.push(`provider_type=${selectedType}`);
      }
      if (searchCity.trim()) {
        params.push(`search=${encodeURIComponent(searchCity.trim())}`);
      }
      
      const data = await apiRequest(endpoint + params.join('&'));
      // API returns {doulas: [...], midwives: [...]} - combine into single array
      const allProviders = [
        ...(data.doulas || []),
        ...(data.midwives || [])
      ].map(p => ({
        user_id: p.user?.user_id,
        full_name: p.user?.full_name,
        email: p.user?.email,
        // Prefer profile picture over user picture, fallback to user picture
        picture: p.profile?.picture || p.user?.picture,
        role: p.user?.role || p.provider_type,
        provider_type: p.provider_type,
        profile: p.profile
      }));
      setProviders(allProviders);
      
      // Fetch team status for each provider
      await fetchTeamStatus(allProviders);
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    }
  };
  
  const fetchTeamStatus = async (providerList: any[]) => {
    try {
      // Fetch share requests to check status
      const shareRequests = await apiRequest('/birth-plan/share-requests');
      const statusMap: Record<string, string> = {};
      
      if (shareRequests?.requests) {
        shareRequests.requests.forEach((req: any) => {
          statusMap[req.provider_id] = req.status;
        });
      }
      
      setTeamStatus(statusMap);
    } catch (error) {
      console.error('Error fetching team status:', error);
    }
  };
  
  useEffect(() => {
    fetchProviders();
  }, [selectedType]);
  
  // Also fetch on mount
  useEffect(() => {
    fetchProviders();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  };
  
  const handleSearch = () => {
    fetchProviders();
  };
  
  const handleContactProvider = async (provider: any) => {
    if (!provider?.user_id || contactingProvider) return;
    
    setContactingProvider(true);
    setSelectedProvider(provider);
    
    try {
      // Check if there's an existing conversation with this provider
      const conversationsData = await apiRequest(API_ENDPOINTS.MESSAGES_CONVERSATIONS);
      const existingConv = conversationsData.conversations?.find(
        (c: any) => c.other_user_id === provider.user_id
      );
      
      if (existingConv) {
        // Navigate to existing conversation
        router.push({
          pathname: '/(mom)/messages',
          params: { openConversation: provider.user_id }
        });
      } else {
        // Create a new conversation with pre-populated message
        const prefilledMessage = `Hi ${provider.full_name}, I found you on True Joy Birthing and would love to learn more about working together.`;
        
        // Send the initial message to create the thread
        await apiRequest(API_ENDPOINTS.MESSAGES, {
          method: 'POST',
          body: {
            receiver_id: provider.user_id,
            content: prefilledMessage,
          },
        });
        
        // Navigate to messages with this provider
        router.push({
          pathname: '/(mom)/messages',
          params: { openConversation: provider.user_id }
        });
      }
    } catch (error: any) {
      // If message sending fails (e.g., no connection), still navigate to messages
      Alert.alert(
        'Start Conversation',
        `Would you like to connect with ${provider.full_name}? You may need to share your birth plan with them first to send messages.`,
        [
          { text: 'Go to My Team', onPress: () => router.push('/(mom)/my-team') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setContactingProvider(false);
      setSelectedProvider(null);
    }
  };
  
  const handleAddToTeam = async (provider: any) => {
    if (!provider?.user_id || addingToTeam) return;
    
    setAddingToTeam(true);
    
    try {
      // Check current status
      const currentStatus = teamStatus[provider.user_id];
      
      if (currentStatus === 'accepted') {
        Alert.alert('Already on Team', `${provider.full_name} is already on your team!`);
        return;
      }
      
      if (currentStatus === 'pending') {
        Alert.alert('Request Pending', `You've already sent a request to ${provider.full_name}. They'll be notified to accept.`);
        return;
      }
      
      // Send share request
      await apiRequest('/birth-plan/share', {
        method: 'POST',
        body: {
          provider_id: provider.user_id,
        },
      });
      
      // Update local status
      setTeamStatus(prev => ({
        ...prev,
        [provider.user_id]: 'pending'
      }));
      
      Alert.alert(
        'Request Sent!',
        `Your birth plan has been shared with ${provider.full_name}. They'll be notified and can accept your request to join your team.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error adding to team:', error);
      
      if (error.message?.includes('already')) {
        Alert.alert('Already Shared', `You've already shared your birth plan with ${provider.full_name}.`);
      } else {
        Alert.alert('Error', 'Failed to send request. Please try again.');
      }
    } finally {
      setAddingToTeam(false);
    }
  };
  
  const getTeamButtonText = (providerId: string) => {
    const status = teamStatus[providerId];
    if (status === 'accepted') return 'On Team';
    if (status === 'pending') return 'Pending';
    return 'Add to Team';
  };
  
  const getTeamButtonDisabled = (providerId: string) => {
    const status = teamStatus[providerId];
    return status === 'accepted' || status === 'pending';
  };
  
  const getRoleColor = (role: string) => {
    return role === 'DOULA' ? COLORS.roleDoula : COLORS.roleMidwife;
  };
  
  const getRoleIcon = (role: string) => {
    return role === 'DOULA' ? 'heart' : 'medkit';
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid="marketplace-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Find Your Team</Text>
          <Text style={styles.subtitle}>Connect with doulas and midwives in your area</Text>
        </View>
        
        {/* Search Section */}
        <Card style={styles.searchCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Icon name="search-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchCity}
                onChangeText={setSearchCity}
                placeholder="Search by name, city, state, or zip..."
                placeholderTextColor={COLORS.textLight}
                onSubmitEditing={handleSearch}
                data-testid="search-city-input"
              />
            </View>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} data-testid="search-btn">
              <Icon name="search" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          {/* Type Filter */}
          <View style={styles.typeFilter}>
            {PROVIDER_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  selectedType === type && styles.typeChipActive,
                ]}
                onPress={() => setSelectedType(type)}
                data-testid={`filter-${type.toLowerCase()}`}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selectedType === type && styles.typeChipTextActive,
                  ]}
                >
                  {type === 'All' ? 'All Providers' : type === 'DOULA' ? 'Doulas' : 'Midwives'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
        
        {/* Results */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {providers.length} Provider{providers.length !== 1 ? 's' : ''} Found
          </Text>
        </View>
        
        {providers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="search-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No providers found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search filters or check back later
            </Text>
          </Card>
        ) : (
          providers.map((provider) => (
            <TouchableOpacity
              key={provider.user_id}
              activeOpacity={0.8}
              onPress={() => setSelectedProvider(provider)}
              data-testid={`provider-card-${provider.user_id}`}
            >
              <Card style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <View style={[styles.providerAvatar, { backgroundColor: getRoleColor(provider.role) + '20' }]}>
                    {provider.picture ? (
                      <Image source={{ uri: provider.picture }} style={styles.avatarImage} />
                    ) : (
                      <Icon name={getRoleIcon(provider.role)} size={24} color={getRoleColor(provider.role)} />
                    )}
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{provider.full_name}</Text>
                    <View style={styles.locationRow}>
                      <Icon name="location-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.locationText}>
                        {provider.profile?.location_city && provider.profile?.location_state
                          ? `${provider.profile.location_city}, ${provider.profile.location_state}`
                          : 'Location not set'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(provider.role) + '20' }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(provider.role) }]}>
                      {provider.role}
                    </Text>
                  </View>
                </View>
                
                {/* Practice Info */}
                {provider.profile?.practice_name && (
                  <Text style={styles.practiceName}>{provider.profile.practice_name}</Text>
                )}
                
                {/* Services/Credentials */}
                <View style={styles.tagsRow}>
                  {provider.role === 'DOULA' && provider.profile?.services_offered?.slice(0, 3).map((service: string) => (
                    <View key={service} style={styles.tag}>
                      <Text style={styles.tagText}>{service}</Text>
                    </View>
                  ))}
                  {provider.role === 'MIDWIFE' && provider.profile?.credentials && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{provider.profile.credentials}</Text>
                    </View>
                  )}
                  {provider.role === 'MIDWIFE' && provider.profile?.birth_settings_served?.slice(0, 2).map((setting: string) => (
                    <View key={setting} style={styles.tag}>
                      <Text style={styles.tagText}>{setting}</Text>
                    </View>
                  ))}
                </View>
                
                {/* Years & Status */}
                <View style={styles.statsRow}>
                  {provider.profile?.years_in_practice && (
                    <View style={styles.statItem}>
                      <Icon name="time-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.statText}>{provider.profile.years_in_practice} years</Text>
                    </View>
                  )}
                  {provider.profile?.accepting_new_clients && (
                    <View style={styles.statItem}>
                      <Icon name="checkmark-circle" size={14} color={COLORS.success} />
                      <Text style={[styles.statText, { color: COLORS.success }]}>Accepting Clients</Text>
                    </View>
                  )}
                </View>
                
                {/* Quick Action Buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.cardActionBtn, styles.cardContactBtn]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleContactProvider(provider);
                    }}
                    data-testid={`contact-btn-${provider.user_id}`}
                  >
                    <Icon name="chatbubble-outline" size={16} color={COLORS.white} />
                    <Text style={styles.cardActionBtnText}>Contact</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.cardActionBtn, 
                      styles.cardAddBtn,
                      getTeamButtonDisabled(provider.user_id) && styles.cardDisabledBtn
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAddToTeam(provider);
                    }}
                    disabled={getTeamButtonDisabled(provider.user_id)}
                    data-testid={`add-btn-${provider.user_id}`}
                  >
                    <Icon 
                      name={teamStatus[provider.user_id] === 'accepted' ? 'checkmark-circle' : 'person-add-outline'} 
                      size={16} 
                      color={COLORS.white} 
                    />
                    <Text style={styles.cardActionBtnText}>
                      {getTeamButtonText(provider.user_id)}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.viewProfile}>
                  <Text style={styles.viewProfileText}>View Profile</Text>
                  <Icon name="chevron-forward" size={16} color={COLORS.primary} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Provider Detail Modal */}
      <Modal
        visible={!!selectedProvider}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProvider(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedProvider(null)} data-testid="close-modal-btn">
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Provider Profile</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {selectedProvider && (
            <ScrollView style={styles.modalContent}>
              {/* Provider Header */}
              <View style={styles.profileHeader}>
                <View style={[styles.profileAvatar, { backgroundColor: getRoleColor(selectedProvider.role) + '20' }]}>
                  {selectedProvider.picture ? (
                    <Image source={{ uri: selectedProvider.picture }} style={styles.profileAvatarImage} />
                  ) : (
                    <Icon name={getRoleIcon(selectedProvider.role)} size={40} color={getRoleColor(selectedProvider.role)} />
                  )}
                </View>
                <Text style={styles.profileName}>{selectedProvider.full_name}</Text>
                <View style={[styles.profileRoleBadge, { backgroundColor: getRoleColor(selectedProvider.role) }]}>
                  <Text style={styles.profileRoleText}>{selectedProvider.role}</Text>
                </View>
              </View>
              
              {/* Practice Info */}
              {selectedProvider.profile?.practice_name && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Practice</Text>
                  <Text style={styles.sectionValue}>{selectedProvider.profile.practice_name}</Text>
                </View>
              )}
              
              {/* Location */}
              {selectedProvider.profile?.location_city && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <Text style={styles.sectionValue}>
                    {selectedProvider.profile.location_city}, {selectedProvider.profile.location_state}
                  </Text>
                </View>
              )}
              
              {/* Experience */}
              {selectedProvider.profile?.years_in_practice && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Experience</Text>
                  <Text style={styles.sectionValue}>{selectedProvider.profile.years_in_practice} years in practice</Text>
                </View>
              )}
              
              {/* Credentials (Midwife) */}
              {selectedProvider.profile?.credentials && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Credentials</Text>
                  <Text style={styles.sectionValue}>{selectedProvider.profile.credentials}</Text>
                </View>
              )}
              
              {/* Services (Doula) */}
              {selectedProvider.profile?.services_offered?.length > 0 && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Services Offered</Text>
                  <View style={styles.profileTags}>
                    {selectedProvider.profile.services_offered.map((service: string) => (
                      <View key={service} style={[styles.profileTag, { backgroundColor: getRoleColor(selectedProvider.role) + '20' }]}>
                        <Text style={[styles.profileTagText, { color: getRoleColor(selectedProvider.role) }]}>{service}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Birth Settings (Midwife) */}
              {selectedProvider.profile?.birth_settings_served?.length > 0 && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Birth Settings</Text>
                  <View style={styles.profileTags}>
                    {selectedProvider.profile.birth_settings_served.map((setting: string) => (
                      <View key={setting} style={[styles.profileTag, { backgroundColor: getRoleColor(selectedProvider.role) + '20' }]}>
                        <Text style={[styles.profileTagText, { color: getRoleColor(selectedProvider.role) }]}>{setting}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Bio */}
              {selectedProvider.profile?.bio && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{selectedProvider.profile.bio}</Text>
                </View>
              )}
              
              {/* Video Introduction */}
              {selectedProvider.profile?.video_intro_url && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Video Introduction</Text>
                  {(() => {
                    const videoId = getYouTubeVideoId(selectedProvider.profile.video_intro_url);
                    return videoId ? (
                      <TouchableOpacity 
                        style={styles.videoThumbnailContainer}
                        onPress={() => {
                          // Open YouTube video in browser
                          const url = `https://www.youtube.com/watch?v=${videoId}`;
                          if (Platform.OS === 'web') {
                            window.open(url, '_blank');
                          } else {
                            // For native platforms, use Linking
                            import('react-native').then(({ Linking }) => {
                              Linking.openURL(url);
                            });
                          }
                        }}
                        data-testid="video-play-btn"
                      >
                        <Image 
                          source={{ uri: getYouTubeThumbnail(videoId) }} 
                          style={styles.videoThumbnail}
                        />
                        <View style={styles.playIconOverlay}>
                          <Icon name="play-circle" size={48} color={COLORS.white} />
                        </View>
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </View>
              )}
              
              {/* More About Me */}
              {selectedProvider.profile?.more_about_me && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>More About Me</Text>
                  <Text style={styles.bioText}>{selectedProvider.profile.more_about_me}</Text>
                </View>
              )}
              
              {/* Status */}
              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>Availability</Text>
                <View style={styles.statusRow}>
                  <Icon 
                    name={selectedProvider.profile?.accepting_new_clients ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={selectedProvider.profile?.accepting_new_clients ? COLORS.success : COLORS.error} 
                  />
                  <Text style={[
                    styles.statusText, 
                    { color: selectedProvider.profile?.accepting_new_clients ? COLORS.success : COLORS.error }
                  ]}>
                    {selectedProvider.profile?.accepting_new_clients ? 'Accepting New Clients' : 'Not Accepting New Clients'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <View style={styles.footerButtonsRow}>
              <TouchableOpacity
                style={[styles.footerButton, styles.contactButton]}
                onPress={() => handleContactProvider(selectedProvider)}
                disabled={contactingProvider}
                data-testid="contact-provider-btn"
              >
                {contactingProvider ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="chatbubble-outline" size={20} color={COLORS.white} />
                    <Text style={styles.footerButtonText}>Contact</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.footerButton, 
                  styles.addButton,
                  getTeamButtonDisabled(selectedProvider?.user_id) && styles.disabledButton
                ]}
                onPress={() => handleAddToTeam(selectedProvider)}
                disabled={addingToTeam || getTeamButtonDisabled(selectedProvider?.user_id)}
                data-testid="add-to-team-btn"
              >
                {addingToTeam ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon 
                      name={teamStatus[selectedProvider?.user_id] === 'accepted' ? 'checkmark-circle' : 'person-add-outline'} 
                      size={20} 
                      color={COLORS.white} 
                    />
                    <Text style={styles.footerButtonText}>
                      {getTeamButtonText(selectedProvider?.user_id)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchCard: {
    marginBottom: SIZES.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    marginRight: SIZES.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeFilter: {
    flexDirection: 'row',
  },
  typeChip: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    marginRight: SIZES.sm,
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  typeChipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.bodyBold,
  },
  resultsHeader: {
    marginBottom: SIZES.md,
  },
  resultsTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  providerCard: {
    marginBottom: SIZES.md,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  roleBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  roleText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  practiceName: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SIZES.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.sm,
  },
  tag: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
    marginRight: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  tagText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: SIZES.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.lg,
  },
  statText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    gap: 4,
  },
  cardContactBtn: {
    backgroundColor: COLORS.primary,
  },
  cardAddBtn: {
    backgroundColor: COLORS.success,
  },
  cardDisabledBtn: {
    backgroundColor: COLORS.textLight,
    opacity: 0.7,
  },
  cardActionBtnText: {
    color: COLORS.white,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  viewProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewProfileText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.primary,
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileName: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  profileRoleBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
  },
  profileRoleText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  profileSection: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  sectionValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  profileTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  profileTag: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    marginRight: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  profileTagText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  bioText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  videoThumbnailContainer: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
    position: 'relative',
    marginTop: SIZES.sm,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    marginLeft: SIZES.sm,
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    gap: SIZES.xs,
  },
  contactButton: {
    backgroundColor: COLORS.primary,
  },
  addButton: {
    backgroundColor: COLORS.success,
  },
  disabledButton: {
    backgroundColor: COLORS.textLight,
    opacity: 0.7,
  },
  footerButtonText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
  },
  messageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  messageModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    width: '100%',
    maxWidth: 400,
  },
  messageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  messageModalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  messageTextArea: {
    margin: SIZES.md,
    padding: SIZES.md,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    minHeight: 120,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  messageModalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
