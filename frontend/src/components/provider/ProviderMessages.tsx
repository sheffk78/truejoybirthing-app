// Shared Messages Screen for Doula and Midwife
// MIGRATED to use createThemedStyles for dynamic theming

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import { SIZES } from '../../constants/theme';
import { useColors, createThemedStyles, ThemeColors } from '../../hooks/useThemedStyles';
import { ProviderConfig } from './config/providerConfig';

interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_role: string;
  other_user_picture?: string | null;
  last_message?: string;
  last_message_content?: string;
  last_message_time?: string;
  unread_count: number;
}

interface Message {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sent_at?: string; // legacy alias
  read: boolean;
}

interface ProviderMessagesProps {
  config: ProviderConfig;
}

export default function ProviderMessages({ config }: ProviderMessagesProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const params = useLocalSearchParams<{ clientId?: string; clientName?: string; clientUserId?: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // New message modal state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedClientForNewMessage, setSelectedClientForNewMessage] = useState<any>(null);
  const [newConversationMessage, setNewConversationMessage] = useState('');
  const [startingConversation, setStartingConversation] = useState(false);
  
  const fetchConversations = async () => {
    try {
      const data = await apiRequest<{ conversations: Conversation[] }>(API_ENDPOINTS.MESSAGES_CONVERSATIONS);
      setConversations(data.conversations || []);
      return data.conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  };
  
  const fetchClients = async () => {
    try {
      const data = await apiRequest('/provider/clients');
      setClients(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  };
  
  const fetchCurrentUser = async () => {
    try {
      const data = await apiRequest<{ user_id: string }>(API_ENDPOINTS.AUTH_ME);
      setCurrentUserId(data.user_id);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };
  
  useEffect(() => {
    const init = async () => {
      const [convos, clientsList] = await Promise.all([
        fetchConversations(),
        fetchClients(),
        fetchCurrentUser(),
      ]);
      
      // If coming from client detail with clientUserId, auto-open conversation or show new message modal
      if (params.clientUserId) {
        const existingConvo = convos.find((c: Conversation) => c.other_user_id === params.clientUserId);
        if (existingConvo) {
          openConversation(existingConvo);
        } else {
          const client = clientsList.find((c: any) => c.linked_mom_id === params.clientUserId);
          if (client) {
            setSelectedClientForNewMessage(client);
            setShowNewMessageModal(true);
          }
        }
      }
    };
    init();
  }, [params.clientUserId]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    await fetchClients();
    setRefreshing(false);
  };
  
  const startNewConversation = async () => {
    if (!selectedClientForNewMessage || !newConversationMessage.trim() || startingConversation) return;
    
    setStartingConversation(true);
    try {
      await apiRequest(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        body: {
          receiver_id: selectedClientForNewMessage.linked_mom_id,
          content: newConversationMessage.trim(),
        },
      });
      
      const convos = await fetchConversations();
      const newConvo = convos.find((c: Conversation) => c.other_user_id === selectedClientForNewMessage.linked_mom_id);
      
      setShowNewMessageModal(false);
      setNewConversationMessage('');
      setSelectedClientForNewMessage(null);
      
      if (newConvo) {
        openConversation(newConvo);
      }
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to send message'}`);
      }
    } finally {
      setStartingConversation(false);
    }
  };
  
  const openNewMessageModal = async () => {
    await fetchClients();
    setSelectedClientForNewMessage(null);
    setNewConversationMessage('');
    setShowNewMessageModal(true);
  };
  
  const openConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    try {
      const data = await apiRequest<{ messages: Message[] }>(
        `${API_ENDPOINTS.MESSAGES}/${conversation.other_user_id}`
      );
      setMessages(data.messages || []);
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    setSending(true);
    try {
      await apiRequest(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        body: {
          receiver_id: selectedConversation.other_user_id,
          content: newMessage.trim(),
        },
      });
      
      setNewMessage('');
      const data = await apiRequest<{ messages: Message[] }>(
        `${API_ENDPOINTS.MESSAGES}/${selectedConversation.other_user_id}`
      );
      setMessages(data.messages || []);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };
  
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  const getRoleColor = (role: string) => {
    return role === 'MOM' ? colors.primary : role === 'MIDWIFE' ? colors.roleMidwife : colors.roleDoula;
  };

  const primaryColor = config.primaryColor;
  
  // Get clients that don't already have a conversation
  const clientsWithoutConversation = clients.filter(client => 
    client.linked_mom_id && !conversations.some(c => c.other_user_id === client.linked_mom_id)
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']} data-testid={`${config.role.toLowerCase()}-messages-screen`}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Connect with your clients</Text>
          </View>
          <Pressable 
            style={({ pressed }) => [
              styles.newMessageButton, 
              { backgroundColor: primaryColor },
              pressed && { opacity: 0.7 }
            ]}
            onPress={openNewMessageModal}
            testID="new-message-btn"
            accessibilityLabel="Start new conversation"
            accessibilityRole="button"
          >
            <Icon name="add" size={24} color={colors.white} />
          </Pressable>
        </View>
        
        {conversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="chatbubbles-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No Conversations Yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Start messaging your clients to provide support and updates.
            </Text>
          </Card>
        ) : (
          conversations.map(conversation => (
            <TouchableOpacity
              key={conversation.conversation_id}
              onPress={() => openConversation(conversation)}
              data-testid={`conversation-${conversation.conversation_id}`}
            >
              <Card style={styles.conversationCard}>
                <View style={styles.conversationRow}>
                  {conversation.other_user_picture ? (
                    <Image 
                      source={{ uri: conversation.other_user_picture }} 
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: getRoleColor(conversation.other_user_role) + '20' }]}>
                      <Icon 
                        name="person" 
                        size={24} 
                        color={getRoleColor(conversation.other_user_role)} 
                      />
                    </View>
                  )}
                  <View style={styles.conversationInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.userName, { color: colors.text }]}>{conversation.other_user_name}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(conversation.other_user_role) + '20' }]}>
                        <Text style={[styles.roleText, { color: getRoleColor(conversation.other_user_role) }]}>
                          {conversation.other_user_role}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                      {conversation.last_message_content || conversation.last_message || 'No messages yet'}
                    </Text>
                  </View>
                  <View style={styles.metaColumn}>
                    {conversation.last_message_time && (
                      <Text style={[styles.timeText, { color: colors.textLight }]}>
                        {formatTime(conversation.last_message_time)}
                      </Text>
                    )}
                    {conversation.unread_count > 0 && (
                      <View style={[styles.unreadBadge, { backgroundColor: primaryColor }]}>
                        <Text style={[styles.unreadText, { color: colors.white }]}>{conversation.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Chat Modal */}
      <Modal
        visible={!!selectedConversation}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedConversation(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          {/* Chat Header */}
          <View style={[styles.chatHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setSelectedConversation(null)} style={{ padding: SIZES.xs }}>
              <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={[styles.chatHeaderName, { color: colors.text }]}>{selectedConversation?.other_user_name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedConversation?.other_user_role || '') + '20' }]}>
                <Text style={[styles.roleText, { color: getRoleColor(selectedConversation?.other_user_role || '') }]}>
                  {selectedConversation?.other_user_role}
                </Text>
              </View>
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Messages */}
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.messagesContainer}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            >
              {messages.map(message => {
                const isMe = message.sender_id === currentUserId;
                return (
                  <View
                    key={message.message_id}
                    style={[
                      styles.messageBubble,
                      isMe ? [styles.messageBubbleMe, { backgroundColor: primaryColor }] : [styles.messageBubbleOther, { backgroundColor: colors.surface }],
                    ]}
                  >
                    <Text style={[styles.messageText, isMe ? { color: colors.white } : { color: colors.text }]}>
                      {message.content}
                    </Text>
                    <Text style={[styles.messageTime, isMe && styles.messageTimeMe, !isMe && { color: colors.textLight }]}>
                      {formatTime(message.created_at || message.sent_at || '')}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            
            {/* Input */}
            <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.messageInput, { backgroundColor: colors.background, color: colors.text }]}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor={colors.textLight}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: primaryColor },
                  (!newMessage.trim() || sending) && { backgroundColor: colors.textLight }
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending}
              >
                <Icon name="send" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      
      {/* New Message Modal */}
      <Modal
        visible={showNewMessageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewMessageModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          <View style={[styles.chatHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setShowNewMessageModal(false)} style={{ padding: SIZES.xs }}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={[styles.chatHeaderName, { color: colors.text }]}>New Message</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.newMessageContent}>
            <Text style={[styles.newMessageLabel, { color: colors.text }]}>Select Client</Text>
            
            {clientsWithoutConversation.length === 0 ? (
              <Text style={[styles.noClientsText, { color: colors.textLight }]}>
                All your clients already have conversations or no connected clients yet.
              </Text>
            ) : (
              <View style={styles.clientList}>
                {clientsWithoutConversation.map(client => (
                  <TouchableOpacity
                    key={client.client_id}
                    style={[
                      styles.clientSelectItem,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectedClientForNewMessage?.client_id === client.client_id && { borderColor: primaryColor, borderWidth: 2 }
                    ]}
                    onPress={() => setSelectedClientForNewMessage(client)}
                  >
                    {client.picture ? (
                      <Image 
                        source={{ uri: client.picture }} 
                        style={styles.clientAvatarImage}
                      />
                    ) : (
                      <View style={[styles.clientAvatar, { backgroundColor: colors.primary + '20' }]}>
                        <Icon name="person" size={20} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.clientSelectInfo}>
                      <Text style={[styles.clientSelectName, { color: colors.text }]}>{client.name}</Text>
                      {client.edd && (
                        <Text style={[styles.clientSelectEdd, { color: colors.textSecondary }]}>
                          Due: {new Date(client.edd).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    {selectedClientForNewMessage?.client_id === client.client_id && (
                      <Icon name="checkmark-circle" size={24} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {selectedClientForNewMessage && (
              <>
                <Text style={[styles.newMessageLabel, { color: colors.text }]}>Message</Text>
                <TextInput
                  style={[styles.newMessageInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={newConversationMessage}
                  onChangeText={setNewConversationMessage}
                  placeholder="Type your message..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={4}
                />
              </>
            )}
          </ScrollView>
          
          <View style={[styles.newMessageFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.startConversationButton,
                { backgroundColor: primaryColor },
                (!selectedClientForNewMessage || !newConversationMessage.trim() || startingConversation) && 
                  styles.startConversationButtonDisabled
              ]}
              onPress={startNewConversation}
              disabled={!selectedClientForNewMessage || !newConversationMessage.trim() || startingConversation}
              data-testid="start-conversation-btn"
            >
              <Text style={[styles.startConversationText, { color: colors.white }]}>
                {startingConversation ? 'Sending...' : 'Start Conversation'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Themed styles using createThemedStyles
const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1 },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.lg },
  title: { fontSize: SIZES.fontXxl, fontWeight: '700' },
  subtitle: { fontSize: SIZES.fontMd, marginTop: 4 },
  newMessageButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: SIZES.xl },
  emptyText: { fontSize: SIZES.fontLg, fontWeight: '600', marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, marginTop: SIZES.xs, textAlign: 'center', paddingHorizontal: SIZES.lg },
  conversationCard: { marginBottom: SIZES.sm },
  conversationRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  avatarImage: { width: 48, height: 48, borderRadius: 24, marginRight: SIZES.md },
  conversationInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: SIZES.fontMd, fontWeight: '600', marginRight: SIZES.sm },
  roleBadge: { paddingHorizontal: SIZES.xs, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  roleText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  lastMessage: { fontSize: SIZES.fontSm },
  metaColumn: { alignItems: 'flex-end' },
  timeText: { fontSize: SIZES.fontXs, marginBottom: 4 },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  modalContainer: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, borderBottomWidth: 1 },
  chatHeaderInfo: { flex: 1, alignItems: 'center' },
  chatHeaderName: { fontSize: SIZES.fontLg, fontWeight: '600' },
  messagesContainer: { padding: SIZES.md, paddingBottom: SIZES.xl },
  messageBubble: { maxWidth: '80%', padding: SIZES.md, borderRadius: SIZES.radiusMd, marginBottom: SIZES.sm },
  messageBubbleMe: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  messageBubbleOther: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: SIZES.fontMd, lineHeight: 22 },
  messageTime: { fontSize: SIZES.fontXs, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: SIZES.md, borderTopWidth: 1 },
  messageInput: { flex: 1, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, fontSize: SIZES.fontMd, maxHeight: 100, marginRight: SIZES.sm },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  newMessageContent: { flex: 1, padding: SIZES.md },
  newMessageLabel: { fontSize: SIZES.fontMd, fontWeight: '600', marginBottom: SIZES.sm, marginTop: SIZES.md },
  clientList: { gap: SIZES.sm },
  noClientsText: { fontSize: SIZES.fontMd, textAlign: 'center', padding: SIZES.xl },
  clientSelectItem: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, borderRadius: SIZES.radiusMd, borderWidth: 1 },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  clientAvatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: SIZES.md },
  clientSelectInfo: { flex: 1 },
  clientSelectName: { fontSize: SIZES.fontMd, fontWeight: '600' },
  clientSelectEdd: { fontSize: SIZES.fontSm, marginTop: 2 },
  newMessageInput: { borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, borderWidth: 1, minHeight: 100, textAlignVertical: 'top' },
  newMessageFooter: { padding: SIZES.md, borderTopWidth: 1 },
  startConversationButton: { borderRadius: SIZES.radiusMd, padding: SIZES.md, alignItems: 'center', justifyContent: 'center' },
  startConversationButtonDisabled: { opacity: 0.5 },
  startConversationText: { fontSize: SIZES.fontMd, fontWeight: '600' },
}));
