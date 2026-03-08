// Shared Notes Screen for Doula and Midwife
// Uses unified /api/provider/notes endpoint
// Supports client-scoped access when clientId param is provided
// MIGRATED to use createThemedStyles for dynamic theming

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
import { SIZES, FONTS } from '../../constants/theme';
import { useColors, createThemedStyles, ThemeColors } from '../../hooks/useThemedStyles';
import { ProviderConfig } from './config/providerConfig';

const NOTE_TYPES = ['Prenatal', 'Birth', 'Postpartum', 'General'];

interface ProviderNotesProps {
  config: ProviderConfig;
}

// Dynamic TYPE_COLORS based on theme
const getTypeColors = (colors: ThemeColors, primaryColor: string): Record<string, string> => ({
  'Prenatal': primaryColor,
  'Birth': colors.error,
  'Postpartum': colors.accent,
  'General': colors.textSecondary,
});

export default function ProviderNotes({ config }: ProviderNotesProps) {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);
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
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [noteType, setNoteType] = useState('General');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const primaryColor = config.primaryColor;
  const TYPE_COLORS = getTypeColors(colors, primaryColor);
  
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
  
  const handleAddNote = () => {
    setSelectedClientId(params.clientId || '');
    setNoteType('General');
    setTitle('');
    setContent('');
    setModalVisible(true);
  };
  
  const handleSaveNote = async () => {
    if (!selectedClientId) {
      Alert.alert('Required', 'Please select a client');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Required', 'Please enter note content');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest('/provider/notes', {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          note_type: noteType,
          title: title.trim(),
          content: content.trim(),
        },
      });
      setModalVisible(false);
      fetchData();
      Alert.alert('Success', 'Note saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save note');
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
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete note');
            }
          },
        },
      ]
    );
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.client_id === clientId);
    return client?.name || 'Unknown';
  };
  
  const filteredNotes = filterClientId
    ? notes.filter(note => note.client_id === filterClientId)
    : notes;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']} data-testid="provider-notes-screen">
      {/* Contextual Breadcrumb Header (when client-scoped) */}
      {isClientScoped && (
        <View style={[styles.contextHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.breadcrumb}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.breadcrumbItem}
            >
              <Text style={[styles.breadcrumbLink, { color: primaryColor }]}>
                {clientName || 'Client'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.breadcrumbSeparator, { color: colors.textLight }]}>/</Text>
            <Text style={[styles.breadcrumbCurrent, { color: colors.text }]}>Notes</Text>
          </View>
        </View>
      )}
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {isClientScoped && (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              data-testid="notes-back-btn"
            >
              <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isClientScoped ? `${clientName}'s Notes` : 'Notes'}
            </Text>
            {!isClientScoped && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: primaryColor }]}
            onPress={handleAddNote}
            data-testid="add-note-btn"
          >
            <Icon name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Client Filter (only when not client-scoped) */}
        {!isClientScoped && clients.length > 0 && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterChip, 
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !filterClientId && { backgroundColor: primaryColor, borderColor: primaryColor }
                ]}
                onPress={() => setFilterClientId(null)}
              >
                <Text style={[
                  styles.filterChipText, 
                  { color: colors.textSecondary },
                  !filterClientId && { color: colors.white }
                ]}>All Clients</Text>
              </TouchableOpacity>
              {clients.map(client => (
                <TouchableOpacity
                  key={client.client_id}
                  style={[
                    styles.filterChip, 
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    filterClientId === client.client_id && { backgroundColor: primaryColor, borderColor: primaryColor }
                  ]}
                  onPress={() => setFilterClientId(client.client_id)}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: colors.textSecondary },
                    filterClientId === client.client_id && { color: colors.white }
                  ]}>{client.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Notes List */}
        {filteredNotes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="document-text-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No Notes Yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add notes to keep track of important information about your clients.
            </Text>
          </Card>
        ) : (
          filteredNotes.map(note => {
            const typeColor = TYPE_COLORS[note.note_type] || colors.textSecondary;
            return (
              <Card key={note.note_id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[styles.typeText, { color: typeColor }]}>{note.note_type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteNote(note.note_id)}>
                    <Icon name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text>
                <Text style={[styles.noteContent, { color: colors.textSecondary }]} numberOfLines={3}>
                  {note.content}
                </Text>
                <View style={[styles.noteMeta, { borderTopColor: colors.border }]}>
                  {!isClientScoped && (
                    <Text style={[styles.noteClient, { color: colors.text }]}>
                      {getClientName(note.client_id)}
                    </Text>
                  )}
                  <Text style={[styles.noteDate, { color: colors.textLight }]}>{formatDate(note.created_at)}</Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
      
      {/* Add Note Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Note</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Client Selection */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Client</Text>
            <TouchableOpacity 
              style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowClientPicker(!showClientPicker)}
            >
              <Text style={selectedClientId ? [styles.selectText, { color: colors.text }] : [styles.selectPlaceholder, { color: colors.textLight }]}>
                {selectedClientId ? getClientName(selectedClientId) : 'Select a client'}
              </Text>
              <Icon name={showClientPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            {showClientPicker && (
              <ScrollView style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {clients.map(client => (
                  <TouchableOpacity
                    key={client.client_id}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedClientId(client.client_id);
                      setShowClientPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{client.name}</Text>
                    {selectedClientId === client.client_id && (
                      <Icon name="checkmark" size={20} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            {/* Note Type */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Type</Text>
            <View style={styles.typeOptions}>
              {NOTE_TYPES.map(type => {
                const typeColor = TYPE_COLORS[type] || colors.textSecondary;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption, 
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      noteType === type && { backgroundColor: typeColor + '20', borderColor: typeColor }
                    ]}
                    onPress={() => setNoteType(type)}
                  >
                    <Text style={[
                      styles.typeOptionText, 
                      { color: colors.text },
                      noteType === type && { color: typeColor, fontWeight: '600' }
                    ]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Title */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Note title"
              placeholderTextColor={colors.textLight}
            />
            
            {/* Content */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Content</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your note here..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={6}
            />
          </ScrollView>
          
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Button
              title={saving ? 'Saving...' : 'Save Note'}
              onPress={handleSaveNote}
              disabled={saving}
              fullWidth
              style={{ backgroundColor: primaryColor }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// Themed Styles using createThemedStyles utility
// ============================================================================
const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  
  contextHeader: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
  },
  breadcrumb: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  breadcrumbItem: { paddingVertical: 4 },
  breadcrumbLink: { 
    fontSize: SIZES.fontMd, 
    fontWeight: '500' 
  },
  breadcrumbSeparator: { 
    fontSize: SIZES.fontMd, 
    marginHorizontal: SIZES.sm 
  },
  breadcrumbCurrent: { 
    fontSize: SIZES.fontMd, 
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
  title: { fontSize: SIZES.fontXxl, fontFamily: FONTS.heading },
  subtitle: { fontSize: SIZES.fontSm, fontFamily: FONTS.body },
  addButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  filterContainer: { marginBottom: SIZES.md },
  filterChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusMd, marginRight: SIZES.sm, borderWidth: 1 },
  filterChipText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body },
  
  emptyCard: { alignItems: 'center', padding: SIZES.xl },
  emptyText: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, textAlign: 'center' },
  
  noteCard: { marginBottom: SIZES.sm },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.xs },
  typeBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  typeText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyBold },
  noteTitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, marginBottom: SIZES.xs },
  noteContent: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, marginBottom: SIZES.sm },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: SIZES.sm },
  noteClient: { fontSize: SIZES.fontSm, fontFamily: FONTS.bodyBold },
  noteDate: { fontSize: SIZES.fontXs, fontFamily: FONTS.body },
  
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.heading },
  modalContent: { flex: 1, padding: SIZES.md },
  modalFooter: { padding: SIZES.md, borderTopWidth: 1 },
  
  fieldLabel: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, marginBottom: SIZES.sm, marginTop: SIZES.md },
  clientSelector: { flexDirection: 'row' },
  clientOption: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusMd, marginRight: SIZES.sm, borderWidth: 1 },
  clientOptionText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body },
  
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  typeOption: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusMd, borderWidth: 1 },
  typeOptionText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body },
  
  textInput: { borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, fontFamily: FONTS.body, borderWidth: 1 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  
  selectButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderRadius: SIZES.radiusMd, 
    padding: SIZES.md, 
    borderWidth: 1, 
  },
  selectText: { fontSize: SIZES.fontMd, fontFamily: FONTS.body },
  selectPlaceholder: { fontSize: SIZES.fontMd, fontFamily: FONTS.body },
  pickerContainer: { 
    borderRadius: SIZES.radiusMd, 
    borderWidth: 1, 
    marginTop: SIZES.xs,
    maxHeight: 200,
  },
  pickerItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: SIZES.md, 
    borderBottomWidth: 1, 
  },
  pickerItemText: { fontSize: SIZES.fontMd, fontFamily: FONTS.body },
}));
