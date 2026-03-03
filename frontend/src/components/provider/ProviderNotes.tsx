// Shared Notes Screen for Doula and Midwife
// Uses unified /api/provider/notes endpoint
// Supports client-scoped access when clientId param is provided

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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ProviderConfig } from './config/providerConfig';

const NOTE_TYPES = ['Prenatal', 'Birth', 'Postpartum', 'General'];

interface ProviderNotesProps {
  config: ProviderConfig;
}

export default function ProviderNotes({ config }: ProviderNotesProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; clientName?: string }>();
  const [notes, setNotes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string | null>(params.clientId || null);
  
  // When accessed with clientId, show a contextual header with back navigation
  const isClientScoped = !!params.clientId;
  const clientName = params.clientName || '';
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState(params.clientId || '');
  const [noteType, setNoteType] = useState('General');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const primaryColor = config.primaryColor;

  const TYPE_COLORS: Record<string, string> = {
    'Prenatal': primaryColor,
    'Birth': COLORS.error,
    'Postpartum': COLORS.accent,
    'General': COLORS.textSecondary,
  };
  
  const fetchData = async () => {
    try {
      // Use unified endpoint
      const notesEndpoint = filterClientId 
        ? `/provider/notes?client_id=${filterClientId}`
        : '/provider/notes';
      
      const [notesData, clientsData] = await Promise.all([
        apiRequest(notesEndpoint),
        apiRequest('/provider/clients'),
      ]);
      setNotes(notesData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [filterClientId]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };
  
  const resetForm = () => {
    setSelectedClientId(params.clientId || '');
    setNoteType('General');
    setTitle('');
    setContent('');
  };
  
  const handleCreateNote = async () => {
    if (!selectedClientId || !content.trim()) {
      Alert.alert('Error', 'Please select a client and enter note content');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest('/provider/notes', {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          note_type: noteType,
          title: title.trim() || null,
          content: content.trim(),
          is_private: true,
        },
      });
      
      await fetchData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Note created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/provider/notes/${noteId}`, { method: 'DELETE' });
              await fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredNotes = filterClientId 
    ? notes.filter(n => n.client_id === filterClientId)
    : notes;
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbHeader}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={() => router.replace(config.routes.clients as any)}
            style={styles.breadcrumbItem}
          >
            <Text style={styles.breadcrumbLink}>Clients</Text>
          </TouchableOpacity>
          {isClientScoped && (
            <>
              <Text style={styles.breadcrumbSeparator}>›</Text>
              <TouchableOpacity 
                onPress={() => router.push({ 
                  pathname: config.routes.clientDetail as any, 
                  params: { clientId: params.clientId, clientName: clientName } 
                })}
                style={styles.breadcrumbItem}
                data-testid="back-button"
              >
                <Text style={styles.breadcrumbLink}>{clientName}</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <Text style={styles.breadcrumbCurrent}>Notes</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => setModalVisible(true)}
          data-testid="add-note-btn"
        >
          <Icon name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Client Filter - Only show when NOT client-scoped */}
        {!isClientScoped && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, !filterClientId && { backgroundColor: primaryColor }]}
                onPress={() => setFilterClientId(null)}
              >
                <Text style={[styles.filterChipText, !filterClientId && { color: COLORS.white }]}>All Clients</Text>
              </TouchableOpacity>
              {clients.filter(c => c.is_active !== false).map((client) => (
                <TouchableOpacity
                  key={client.client_id}
                  style={[styles.filterChip, filterClientId === client.client_id && { backgroundColor: primaryColor }]}
                  onPress={() => setFilterClientId(client.client_id)}
                >
                  <Text style={[styles.filterChipText, filterClientId === client.client_id && { color: COLORS.white }]}>
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {filteredNotes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="document-text-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add a note for a client</Text>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.note_id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[note.note_type] || COLORS.textLight) + '20' }]}>
                  <Text style={[styles.typeText, { color: TYPE_COLORS[note.note_type] || COLORS.textLight }]}>
                    {note.note_type}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteNote(note.note_id)} data-testid={`delete-note-${note.note_id}`}>
                  <Icon name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
              {note.title && <Text style={styles.noteTitle}>{note.title}</Text>}
              <Text style={styles.noteContent}>{note.content}</Text>
              <View style={styles.noteMeta}>
                <Text style={styles.noteClient}>{note.client_name}</Text>
                <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
      
      {/* Create Note Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Note</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView 
              style={styles.modalContent} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 140 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Client Selection */}
              <Text style={styles.fieldLabel}>Client</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSelector}>
                {clients.filter(c => c.is_active !== false).map((client) => (
                  <TouchableOpacity
                    key={client.client_id}
                    style={[
                      styles.clientOption,
                      selectedClientId === client.client_id && { backgroundColor: primaryColor, borderColor: primaryColor }
                    ]}
                    onPress={() => setSelectedClientId(client.client_id)}
                  >
                    <Text style={[
                      styles.clientOptionText,
                      selectedClientId === client.client_id && { color: COLORS.white }
                    ]}>
                      {client.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Note Type */}
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeOptions}>
                {NOTE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      noteType === type && { backgroundColor: primaryColor, borderColor: primaryColor }
                    ]}
                    onPress={() => setNoteType(type)}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      noteType === type && { color: COLORS.white }
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Title (optional) */}
              <Text style={styles.fieldLabel}>Title (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Note title..."
                placeholderTextColor={COLORS.textLight}
                value={title}
                onChangeText={setTitle}
              />
              
              {/* Content */}
              <Text style={styles.fieldLabel}>Content</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Write your note here..."
                placeholderTextColor={COLORS.textLight}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
              />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title={saving ? 'Saving...' : 'Save Note'}
                onPress={handleCreateNote}
                disabled={!selectedClientId || !content.trim() || saving}
                loading={saving}
                fullWidth
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  // Breadcrumb styles
  breadcrumbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breadcrumb: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  breadcrumbItem: { paddingVertical: 4 },
  breadcrumbLink: { 
    fontSize: SIZES.fontMd, 
    color: COLORS.primary, 
    fontWeight: '500' 
  },
  breadcrumbSeparator: { 
    fontSize: SIZES.fontMd, 
    color: COLORS.textLight, 
    marginHorizontal: SIZES.sm 
  },
  breadcrumbCurrent: { 
    fontSize: SIZES.fontMd, 
    color: COLORS.textPrimary, 
    fontWeight: '600' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: SIZES.md,
    paddingBottom: 0,
  },
  backButton: { 
    padding: SIZES.xs, 
    marginRight: SIZES.sm,
  },
  title: { fontSize: SIZES.fontXxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary },
  addButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  filterContainer: { marginBottom: SIZES.md },
  filterChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, marginRight: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  filterChipText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary },
  
  emptyCard: { alignItems: 'center', padding: SIZES.xl },
  emptyText: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary, textAlign: 'center' },
  
  noteCard: { marginBottom: SIZES.sm },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.xs },
  typeBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  typeText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyBold },
  noteTitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SIZES.xs },
  noteContent: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginBottom: SIZES.sm },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SIZES.sm },
  noteClient: { fontSize: SIZES.fontSm, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary },
  noteDate: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textLight },
  
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  modalContent: { flex: 1, padding: SIZES.md },
  modalFooter: { padding: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  
  fieldLabel: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SIZES.sm, marginTop: SIZES.md },
  clientSelector: { flexDirection: 'row' },
  clientOption: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, marginRight: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  clientOptionText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textPrimary },
  
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  typeOption: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border },
  typeOptionText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textPrimary },
  
  textInput: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
});
