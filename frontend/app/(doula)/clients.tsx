import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  'Lead': COLORS.info,
  'Contract Sent': COLORS.warning,
  'Contract Signed': COLORS.success,
  'Active': COLORS.roleDoula,
  'Postpartum': COLORS.accent,
  'Completed': COLORS.textLight,
};

export default function DoulaClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [edd, setEdd] = useState('');
  const [birthSetting, setBirthSetting] = useState('');
  
  const fetchClients = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.DOULA_CLIENTS);
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };
  
  useEffect(() => {
    fetchClients();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setEdd('');
    setBirthSetting('');
  };
  
  const handleAddClient = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.DOULA_CLIENTS, {
        method: 'POST',
        body: {
          name,
          email: email || null,
          phone: phone || null,
          edd: edd || null,
          planned_birth_setting: birthSetting || null,
        },
      });
      
      await fetchClients();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Client added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add client');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleDoula} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Clients</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        {/* Client List */}
        {clients.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No clients yet. Add your first client to get started.
            </Text>
          </Card>
        ) : (
          clients.map((client) => (
            <TouchableOpacity key={client.client_id} activeOpacity={0.8}>
              <Card style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientInitial}>
                      {client.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: STATUS_COLORS[client.status] || COLORS.textLight },
                        ]}
                      />
                      <Text style={styles.statusText}>{client.status}</Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
                </View>
                
                {(client.edd || client.planned_birth_setting) && (
                  <View style={styles.clientDetails}>
                    {client.edd && (
                      <View style={styles.detailItem}>
                        <Icon name="calendar-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>EDD: {client.edd}</Text>
                      </View>
                    )}
                    {client.planned_birth_setting && (
                      <View style={styles.detailItem}>
                        <Icon name="location-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.detailText}>{client.planned_birth_setting}</Text>
                      </View>
                    )}
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Add Client Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Input
              label="Client Name *"
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              leftIcon="person-outline"
            />
            
            <Input
              label="Email"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />
            
            <Input
              label="Phone"
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />
            
            <Input
              label="Estimated Due Date"
              placeholder="YYYY-MM-DD"
              value={edd}
              onChangeText={setEdd}
              leftIcon="calendar-outline"
            />
            
            <Input
              label="Planned Birth Setting"
              placeholder="Home, Hospital, Birth Center"
              value={birthSetting}
              onChangeText={setBirthSetting}
              leftIcon="location-outline"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Add Client"
              onPress={handleAddClient}
              loading={saving}
              fullWidth
            />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleDoula,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  clientCard: {
    marginBottom: SIZES.sm,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleDoula + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  clientInitial: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.roleDoula,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  clientDetails: {
    flexDirection: 'row',
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: 4,
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
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
