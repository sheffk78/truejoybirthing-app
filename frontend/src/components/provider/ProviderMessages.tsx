// Shared Messages Screen for Doula and Midwife
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES } from '../../constants/theme';
import { ProviderConfig } from '../config/providerConfig';
import { Conversation, Message } from '../types/provider';

interface ProviderMessagesProps {
  config: ProviderConfig;
}

export default function ProviderMessages({ config }: ProviderMessagesProps) {
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
          // Open existing conversation
          openConversation(existingConvo);
        } else {
          // Find client and open new message modal
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
  
  // Start a new conversation with a client
  const startNewConversation = async () => {
    if (!selectedClientForNewMessage || !newConversationMessage.trim() || startingConversation) return;
    
    setStartingConversation(true);
    try {
      // Send first message to create conversation
      await apiRequest(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        body: {
          receiver_id: selectedClientForNewMessage.linked_mom_id,
          content: newConversationMessage.trim(),
        },
      });
      
      // Refresh conversations and open the new one
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
    const date = new Date(dateStr);
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
    return role === 'MOM' ? COLORS.primary : role === 'MIDWIFE' ? COLORS.roleMidwife : COLORS.roleDoula;
  };

  const primaryColor = config.primaryColor;
  
  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid={`${config.role.toLowerCase()}-messages-screen`}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>Connect with your clients</Text>
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
            <Icon name="add" size={24} color={COLORS.white} />
          </Pressable>
        </View>
        
        {conversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="chatbubbles-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Messages from clients will appear here
            </Text>
          </Card>
        ) : (
          conversations.map((conv) => (
            <TouchableOpacity
              key={conv.other_user_id}
              onPress={() => openConversation(conv)}
              data-testid={`conversation-${conv.other_user_id}`}
            >
              <Card style={[styles.conversationCard, conv.unread_count > 0 && { borderLeftWidth: 3, borderLeftColor: primaryColor }]}>
                <View style={styles.conversationRow}>
                  <View style={[styles.avatar, { backgroundColor: getRoleColor(conv.other_user_role) + '20' }]}>
                    <Icon 
                      name="person"
                      size={24} 
                      color={getRoleColor(conv.other_user_role)} 
                    />
                  </View>
                  <View style={styles.conversationInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{conv.other_user_name}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(conv.other_user_role) + '20' }]}>
                        <Text style={[styles.roleText, { color: getRoleColor(conv.other_user_role) }]}>
                          {conv.other_user_role}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {conv.is_sender ? 'You: ' : ''}{conv.last_message_content}
                    </Text>
                  </View>
                  <View style={styles.metaColumn}>
                    <Text style={styles.timeText}>{formatTime(conv.last_message_time)}</Text>
                    {conv.unread_count > 0 && (
                      <View style={[styles.unreadBadge, { backgroundColor: primaryColor }]}>
                        <Text style={styles.unreadText}>{conv.unread_count}</Text>
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
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedConversation(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedConversation(null)} data-testid="close-chat-btn">
              <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName}>{selectedConversation?.other_user_name}</Text>
              <Text style={styles.chatHeaderRole}>{selectedConversation?.other_user_role}</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
          
          <KeyboardAvoidingView 
            style={styles.chatContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            >
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <View 
                    key={msg.message_id} 
                    style={[styles.messageWrapper, isMe && styles.messageWrapperMe]}
                  >
                    <View style={[
                      styles.messageBubble, 
                      isMe ? [styles.messageBubbleMe, { backgroundColor: primaryColor }] : styles.messageBubbleOther
                    ]}>
                      <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{msg.content}</Text>
                      <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                        {formatTime(msg.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.textLight}
                multiline
                maxLength={1000}
                data-testid="message-input"
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  { backgroundColor: primaryColor },
                  (!newMessage.trim() || sending) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending}
                data-testid="send-message-btn"
              >
                <Icon name="paper-plane" size={20} color={COLORS.white} />
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowNewMessageModal(false)} data-testid="close-new-message-btn">
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.chatHeaderName}>New Message</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.newMessageContent}>
            {/* Client Selection */}
            <Text style={styles.newMessageLabel}>Select Client</Text>
            <View style={styles.clientList}>
              {clients.filter(c => c.linked_mom_id).length === 0 ? (
                <Text style={styles.noClientsText}>No clients with linked accounts available</Text>
              ) : (
                clients.filter(c => c.linked_mom_id).map((client) => (
                  <TouchableOpacity
                    key={client.client_id}
                    style={[
                      styles.clientSelectItem,
                      selectedClientForNewMessage?.client_id === client.client_id && { 
                        backgroundColor: primaryColor + '10', 
                        borderColor: primaryColor 
                      }
                    ]}
                    onPress={() => setSelectedClientForNewMessage(client)}
                    data-testid={`select-client-${client.client_id}`}
                  >
                    <View style={[styles.clientAvatar, { backgroundColor: COLORS.primary + '20' }]}>
                      <Icon name="person" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.clientSelectInfo}>
                      <Text style={styles.clientSelectName}>{client.name}</Text>
                      {client.edd && <Text style={styles.clientSelectEdd}>Due: {client.edd}</Text>}
                    </View>
                    {selectedClientForNewMessage?.client_id === client.client_id && (
                      <Icon name="checkmark-circle" size={24} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
            
            {/* Message Input */}
            {selectedClientForNewMessage && (
              <>
                <Text style={styles.newMessageLabel}>Message</Text>
                <TextInput
                  style={styles.newMessageInput}
                  placeholder="Type your message..."
                  placeholderTextColor={COLORS.textLight}
                  value={newConversationMessage}
                  onChangeText={setNewConversationMessage}
                  multiline
                  numberOfLines={4}
                  data-testid="new-conversation-input"
                />
              </>
            )}
          </ScrollView>
          
          {/* Send Button */}
          <View style={styles.newMessageFooter}>
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
              <Text style={styles.startConversationText}>
                {startingConversation ? 'Sending...' : 'Start Conversation'}
              </Text>
            </TouchableOpacity>
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
    alignItems: 'flex-start',
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
  newMessageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: SIZES.lg,
  },
  conversationCard: {
    marginBottom: SIZES.sm,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  conversationInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SIZES.sm,
  },
  roleBadge: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm,
  },
  roleText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  metaColumn: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: SIZES.fontXs,
    color: COLORS.white,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chatHeaderRole: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  chatContent: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.lg,
  },
  messageWrapper: {
    marginBottom: SIZES.sm,
    flexDirection: 'row',
  },
  messageWrapperMe: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SIZES.md,
    borderRadius: SIZES.radiusLg,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTextMe: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  messageInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: SIZES.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  // New Message Modal styles
  newMessageContent: {
    flex: 1,
    padding: SIZES.md,
  },
  newMessageLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  clientList: {
    gap: SIZES.sm,
  },
  noClientsText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textLight,
    textAlign: 'center',
    padding: SIZES.xl,
  },
  clientSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  clientSelectInfo: {
    flex: 1,
  },
  clientSelectName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clientSelectEdd: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  newMessageInput: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  newMessageFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  startConversationButton: {
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startConversationButtonDisabled: {
    opacity: 0.5,
  },
  startConversationText: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.white,
  },
});
