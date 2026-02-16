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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';
import { API_ENDPOINTS } from '../../src/constants/api';

const PROVIDER_TYPES = ['All', 'DOULA', 'MIDWIFE'];

export default function MarketplaceScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('All');
  const [searchCity, setSearchCity] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const fetchProviders = async () => {
    try {
      let endpoint = '/marketplace/providers?';
      const params = [];
      
      if (selectedType !== 'All') {
        params.push(`provider_type=${selectedType}`);
      }
      if (searchCity.trim()) {
        params.push(`location_city=${encodeURIComponent(searchCity.trim())}`);
      }
      
      const data = await apiRequest(endpoint + params.join('&'));
      setProviders(data);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };
  
  useEffect(() => {
    fetchProviders();
  }, [selectedType]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  };
  
  const handleSearch = () => {
    fetchProviders();
  };
  
  const handleContactProvider = () => {
    setShowMessageModal(true);
  };
  
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedProvider || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      await apiRequest(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        body: {
          receiver_id: selectedProvider.user_id,
          content: messageText.trim(),
        },
      });
      
      setMessageText('');
      setShowMessageModal(false);
      setSelectedProvider(null);
      Alert.alert(
        'Message Sent!',
        `Your message has been sent to ${selectedProvider.full_name}. You can continue the conversation in Messages.`,
        [
          { text: 'Go to Messages', onPress: () => router.push('/(mom)/messages') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
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
              <Icon name="location-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchCity}
                onChangeText={setSearchCity}
                placeholder="Enter city..."
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
                    <Icon name={getRoleIcon(provider.role)} size={24} color={getRoleColor(provider.role)} />
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
                  <Icon name={getRoleIcon(selectedProvider.role)} size={40} color={getRoleColor(selectedProvider.role)} />
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
            <Button
              title="Contact Provider"
              onPress={handleContactProvider}
              fullWidth
              testID="contact-provider-btn"
            />
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Send Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.messageModalOverlay}>
          <View style={styles.messageModalContent}>
            <View style={styles.messageModalHeader}>
              <Text style={styles.messageModalTitle}>
                Message {selectedProvider?.full_name}
              </Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)} data-testid="close-message-modal">
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.messageTextArea}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={`Introduce yourself to ${selectedProvider?.full_name}...`}
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={5}
              maxLength={500}
              data-testid="message-textarea"
            />
            
            <View style={styles.messageModalFooter}>
              <Button
                title={sendingMessage ? "Sending..." : "Send Message"}
                onPress={sendMessage}
                disabled={!messageText.trim() || sendingMessage}
                fullWidth
                testID="send-message-btn"
              />
            </View>
          </View>
        </View>
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
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
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
    fontWeight: '600',
  },
  resultsHeader: {
    marginBottom: SIZES.md,
  },
  resultsTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
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
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
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
    fontWeight: '600',
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
    color: COLORS.primary,
    fontWeight: '500',
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
    fontWeight: '600',
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
  },
  profileName: {
    fontSize: SIZES.fontXl,
    fontWeight: '700',
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
    fontWeight: '600',
    color: COLORS.white,
  },
  profileSection: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  sectionValue: {
    fontSize: SIZES.fontMd,
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
    fontWeight: '500',
  },
  bioText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: SIZES.fontMd,
    fontWeight: '500',
    marginLeft: SIZES.sm,
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
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
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  messageTextArea: {
    margin: SIZES.md,
    padding: SIZES.md,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    minHeight: 120,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  messageModalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
