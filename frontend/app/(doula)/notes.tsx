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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const NOTE_TYPES = ['Prenatal', 'Birth', 'Postpartum'];

const TYPE_COLORS: Record<string, string> = {
  'Prenatal': COLORS.roleDoula,
  'Birth': COLORS.error,
  'Postpartum': COLORS.accent,
};

export default function DoulaNotesScreen() {
  const [notes, setNotes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string | null>(null);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [noteType, setNoteType] = useState('Prenatal');
  const [noteDate, setNoteDate] = useState('');
  const [content, setContent] = useState('');
  
  const fetchData = async () => {
    try {
      const [notesData, clientsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_NOTES),
        apiRequest(API_ENDPOINTS.DOULA_CLIENTS),
      ]);
      setNotes(notesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setSelectedClientId('');
    setNoteType('Prenatal');
    setNoteDate('');
    setContent('');
  };
  
  const handleCreateNote = async () => {
    if (!selectedClientId || !content.trim()) {
      Alert.alert('Error', 'Please select a client and enter note content');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.DOULA_NOTES, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          note_type: noteType,
          content: content,
          date: noteDate || new Date().toISOString().split('T')[0],
        },
      });
      
      await fetchData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Note added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };
  
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.client_id === clientId);
    return client?.name || 'Unknown';
  };
  
  const filteredNotes = filterClientId
    ? notes.filter((n) => n.client_id === filterClientId)
    : notes;
  
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid="doula-notes-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleDoula} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Client Notes</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            data-testid="add-note-btn"
          >
            <Icon name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        {/* Filter by Client */}
        {clients.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Client:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, !filterClientId && styles.filterChipActive]}
                onPress={() => setFilterClientId(null)}
              >
                <Text style={[styles.filterChipText, !filterClientId && styles.filterChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.client_id}
                  style={[styles.filterChip, filterClientId === client.client_id && styles.filterChipActive]}
                  onPress={() => setFilterClientId(client.client_id)}
                >
                  <Text style={[styles.filterChipText, filterClientId === client.client_id && styles.filterChipTextActive]}>
                    {client.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Notes List */}
        {filteredNotes.length === 0 ? (
          <Card data-testid="empty-notes-card">
            <Text style={styles.emptyText}>
              {filterClientId 
                ? 'No notes for this client yet.' 
                : 'No notes yet. Add your first note to get started.'}
            </Text>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.note_id} style={styles.noteCard} data-testid={`note-card-${note.note_id}`}>
              <View style={styles.noteHeader}>
                <View style={styles.noteInfo}>
                  <Text style={styles.clientName}>{getClientName(note.client_id)}</Text>
                  <Text style={styles.noteDate}>{formatDate(note.date)}</Text>
                </View>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: (TYPE_COLORS[note.note_type] || COLORS.textLight) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: TYPE_COLORS[note.note_type] || COLORS.textLight },
                    ]}
                  >
                    {note.note_type}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.noteContent}>{note.content}</Text>
            </Card>
          ))
        )}
      </ScrollView>
      
      {/* Add Note Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} data-testid="close-modal-btn">
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Client Note</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Client Selector */}
            <Text style={styles.fieldLabel}>Select Client *</Text>
            {clients.filter(c => c.status !== 'Completed').length === 0 ? (
              <View style={styles.noClientsMessage}>
                <Icon name="alert-circle-outline" size={24} color={COLORS.textLight} />
                <Text style={styles.noClientsText}>
                  You don't have any current clients yet. Add a client first to create notes.
                </Text>
              </View>
            ) : (
              <View style={styles.clientGrid}>
                {clients.filter(c => c.status !== 'Completed').map((client) => (
                  <TouchableOpacity
                    key={client.client_id}
                    style={[
                      styles.clientOption,
                      selectedClientId === client.client_id && styles.clientOptionSelected,
                    ]}
                    onPress={() => setSelectedClientId(client.client_id)}
                    activeOpacity={0.7}
                    data-testid={`select-client-${client.client_id}`}
                  >
                    <Text
                      style={[
                        styles.clientOptionText,
                        selectedClientId === client.client_id && styles.clientOptionTextSelected,
                      ]}
                    >
                      {client.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Note Type Selector */}
            <Text style={styles.fieldLabel}>Note Type *</Text>
            <View style={styles.typeSelector}>
              {NOTE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    noteType === type && styles.typeOptionSelected,
                  ]}
                  onPress={() => setNoteType(type)}
                  data-testid={`note-type-${type.toLowerCase()}`}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      noteType === type && styles.typeOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Date (Optional) */}
            <Text style={styles.fieldLabel}>Date (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={noteDate}
              onChangeText={setNoteDate}
              placeholder="YYYY-MM-DD (defaults to today)"
              placeholderTextColor={COLORS.textLight}
              data-testid="note-date-input"
            />
            
            {/* Note Content */}
            <Text style={styles.fieldLabel}>Note Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Enter your notes about this client..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              data-testid="note-content-input"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Add Note"
              onPress={handleCreateNote}
              loading={saving}
              fullWidth
              testID="submit-note-btn"
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
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
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
  filterSection: {
    marginBottom: SIZES.lg,
  },
  filterLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.roleDoula,
    borderColor: COLORS.roleDoula,
  },
  filterChipText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  noteCard: {
    marginBottom: SIZES.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  noteInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  noteDate: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  typeBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  typeText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  noteContent: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    lineHeight: 22,
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
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  clientSelector: {
    marginBottom: SIZES.md,
  },
  clientOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
  },
  clientOptionSelected: {
    backgroundColor: COLORS.roleDoula,
    borderColor: COLORS.roleDoula,
  },
  clientOptionText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  clientOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
  },
  typeOption: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.roleDoula,
    borderColor: COLORS.roleDoula,
  },
  typeOptionText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  typeOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
