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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
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
  thread_id?: string;
  thread_status?: string | null;
  source?: string;
  can_accept?: boolean;
  can_decline?: boolean;
}

interface Message {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sent_at?: string; // legacy alias
  read: boolean;
  thread_id?: string;
}

interface ThreadInfo {
  thread_id: string;
  status: string | null;
  created_at: string;
  accepted_at?: string | null;
  can_accept?: boolean;
  can_decline?: boolean;
  decline_reason?: string | null;
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

  // Thread state for pre-acceptance actions
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  // New message modal state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedClientForNewMessage, setSelectedClientForNewMessage] = useState<any>(null);
  const [newConversationMessage, setNewConversationMessage] = useState('');
  const [startingConversation, setStartingConversation] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

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

      // If coming from client detail or leads with clientUserId, auto-open
      // conversation or show new message modal with the client pre-selected.
      if (params.clientUserId) {
        const existingConvo = convos.find((c: Conversation) => c.other_user_id === params.clientUserId);
        if (existingConvo) {
          openConversation(existingConvo);
        } else {
          // Look for the client in the provider's client list first
          let client = clientsList.find((c: any) => c.linked_mom_id === params.clientUserId);
          // If not found (e.g. leads not yet converted to clients), synthesize
          // a minimal client object from the URL params so the new-message modal
          // can still pre-select and pre-fill the recipient.
          if (!client) {
            client = {
              client_id: `lead_${params.clientUserId}`,
              linked_mom_id: params.clientUserId,
              name: params.clientName || 'Client',
            };
          }
          setSelectedClientForNewMessage(client);
          setShowNewMessageModal(true);
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
      setClientSearchQuery('');
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
    setClientSearchQuery('');
    await fetchClients();
    setSelectedClientForNewMessage(null);
    setNewConversationMessage('');
    setShowNewMessageModal(true);
  };

  const openConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setThreadInfo(null);
    try {
      const data = await apiRequest<{ messages: Message[]; thread: ThreadInfo }>(
        `${API_ENDPOINTS.MESSAGES}/${conversation.other_user_id}`
      );
      setMessages(data.messages || []);
      setThreadInfo(data.thread || null);
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
      setThreadInfo(null);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage.trim();
    setSending(true);
    try {
      const response = await apiRequest<{ message: string; data: Message }>(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        body: {
          receiver_id: selectedConversation.other_user_id,
          content: messageText,
        },
      });

      setNewMessage('');

      // Backend returns { message: "Message sent", data: <message_doc> }.
      // Optimistically append the sent message so it appears immediately
      // (the re-fetch below is a safety net for ordering/dedup).
      const sentMessage = response?.data;
      if (sentMessage && typeof sentMessage === 'object' && sentMessage.message_id) {
        setMessages((prev) => {
          if (prev.some(m => m.message_id === sentMessage.message_id)) return prev;
          return [...prev, sentMessage];
        });
      } else {
        const optimistic: Message = {
          message_id: `local_${Date.now()}`,
          sender_id: currentUserId,
          receiver_id: selectedConversation.other_user_id,
          content: messageText,
          read: true,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
      }

      // Safety net: re-fetch to reconcile ordering and any server-side fields
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

  const acceptClient = async () => {
    if (!selectedConversation || !threadInfo?.thread_id || accepting) return;
    setAccepting(true);
    try {
      await apiRequest(
        `${API_ENDPOINTS.MESSAGES}/threads/${threadInfo.thread_id}/accept`,
        { method: 'POST' }
      );
      setShowAcceptModal(false);
      // Refresh thread info and messages
      await Promise.all([
        (async () => {
          const data = await apiRequest<{ messages: Message[]; thread: ThreadInfo }>(
            `${API_ENDPOINTS.MESSAGES}/${selectedConversation.other_user_id}`
          );
          setMessages(data.messages || []);
          setThreadInfo(data.thread || null);
        })(),
        fetchConversations(),
      ]);
    } catch (error: any) {
      console.error('Error accepting client:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to accept client'}`);
      }
    } finally {
      setAccepting(false);
    }
  };

  const declineClient = async () => {
    if (!selectedConversation || !threadInfo?.thread_id || declining) return;
    setDeclining(true);
    try {
      await apiRequest(
        `${API_ENDPOINTS.MESSAGES}/threads/${threadInfo.thread_id}/decline`,
        {
          method: 'POST',
          body: declineReason.trim() ? { reason: declineReason.trim() } : undefined,
        }
      );
      setShowDeclineModal(false);
      setDeclineReason('');
      closeConversation();
      await fetchConversations();
    } catch (error: any) {
      console.error('Error declining client:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to decline client'}`);
      }
    } finally {
      setDeclining(false);
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
    if (role === 'MOM') return colors.primary;
    if (role === 'MIDWIFE') return colors.roleMidwife;
    if (role === 'LACTATION') return colors.roleLactation;
    return colors.roleDoula;
  };

  const closeConversation = () => {
    Keyboard.dismiss();
    setSelectedConversation(null);
    setThreadInfo(null);
    setNewMessage('');
    fetchConversations();
  };

  const isInputDisabled = threadInfo?.status === 'declined';

  const primaryColor = config.primaryColor;

  // Get clients that don't already have a conversation
  const clientsWithoutConversation = clients.filter(client =>
    client.linked_mom_id && !conversations.some(c => c.other_user_id === client.linked_mom_id)
  );

  // Split conversations into two sections
  const newInquiries = conversations.filter(
    (c) => c.thread_status === 'pre_acceptance'
  );
  const myClients = conversations.filter(
    (c) => c.thread_status === 'accepted' || c.thread_status == null || c.thread_status === 'declined'
  );

  // Filter clients in the New Message modal by search query
  const getFilteredClients = (): any[] => {
    const list = [...clientsWithoutConversation];
    const preSelectedInList = selectedClientForNewMessage &&
      list.some(c => c.client_id === selectedClientForNewMessage.client_id);
    if (selectedClientForNewMessage && !preSelectedInList) {
      list.unshift(selectedClientForNewMessage);
    }

    if (!clientSearchQuery.trim()) return list;

    return list.filter(client =>
      (client.name || '').toLowerCase().includes(clientSearchQuery.toLowerCase())
    );
  };

  const renderConversationItem = (conversation: Conversation) => {
    const statusLabel = conversation.thread_status === 'pre_acceptance'
      ? 'New Inquiry'
      : conversation.thread_status === 'declined'
        ? 'Declined'
        : 'Active Client';
    const badgeBg = conversation.thread_status === 'pre_acceptance'
      ? colors.info
      : conversation.thread_status === 'declined'
        ? colors.error
        : colors.success;
    const badgeBgLight = badgeBg + '20';
    const isNewInquiry = conversation.thread_status === 'pre_acceptance';

    return (
      <TouchableOpacity
        key={conversation.conversation_id}
        onPress={() => openConversation(conversation)}
        data-testid={`conversation-${conversation.conversation_id}`}
      >
        <Card style={[styles.conversationCard, isNewInquiry && styles.newInquiryCard]}>
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
                <View style={[styles.statusBadge, { backgroundColor: badgeBgLight }]}>
                  <Text style={[styles.statusText, { color: badgeBg }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.nameRoleRow}>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(conversation.other_user_role) + '20' }]}>
                  <Text style={[styles.roleText, { color: getRoleColor(conversation.other_user_role) }]}>
                    {conversation.other_user_role}
                  </Text>
                </View>
              </View>
              {conversation.last_message_content || conversation.last_message ? (
                <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                  {conversation.last_message_content || conversation.last_message}
                </Text>
              ) : null}
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
    );
  };

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

        {/* Conversation list — split into sections */}
        {conversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="chatbubbles-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No Conversations Yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Start messaging your clients to provide support and updates.
            </Text>
          </Card>
        ) : (
          <>
            {/* New Inquiries Section */}
            {newInquiries.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="information-circle" size={18} color={colors.info} />
                  <Text style={[styles.sectionHeader, { color: colors.text }]}>
                    New Inquiries ({newInquiries.length})
                  </Text>
                </View>
                {newInquiries.map(renderConversationItem)}
              </>
            )}

            {/* My Clients Section */}
            {myClients.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>
                  My Clients ({myClients.length})
                </Text>
                {myClients.map(renderConversationItem)}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Chat Modal */}
      <Modal
        visible={!!selectedConversation}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeConversation}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          {/* Chat Header */}
          <View style={[styles.chatHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={closeConversation} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: SIZES.xs }}>
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

          {/* Pre-acceptance action banner */}
          {threadInfo?.status === 'pre_acceptance' && (
            <View style={[styles.actionBanner, { backgroundColor: colors.infoLight + '40' }]}>
              <Text style={[styles.actionBannerText, { color: colors.text }]}>
                {selectedConversation?.other_user_name} would like to connect with you as a client
              </Text>
              <View style={styles.actionBannerButtons}>
                <Button
                  title={accepting ? 'Accepting...' : 'Accept as Client'}
                  variant="primary"
                  size="sm"
                  loading={accepting}
                  onPress={() => setShowAcceptModal(true)}
                  testID="accept-client-btn"
                  style={styles.actionButton}
                  textStyle={styles.actionButtonText}
                />
                <Button
                  title={declining ? 'Declining...' : 'Decline'}
                  variant="secondary"
                  size="sm"
                  loading={declining}
                  onPress={() => setShowDeclineModal(true)}
                  testID="decline-client-btn"
                  style={styles.actionButton}
                  textStyle={styles.actionButtonText}
                />
              </View>
            </View>
          )}

          {/* Declined notice — input stays disabled */}
          {isInputDisabled && (
            <View style={[styles.declinedNotice, { backgroundColor: colors.errorLight + '40' }]}>
              <Icon name="close-circle" size={16} color={colors.error} />
              <Text style={[styles.declinedNoticeText, { color: colors.error }]}>
                This conversation has been declined. Messaging is disabled.
              </Text>
            </View>
          )}

          {/* Messages */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.messagesContainer}
              keyboardShouldPersistTaps="handled"
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
                style={[styles.messageInput, { backgroundColor: colors.background, color: isInputDisabled ? colors.textLight : colors.text }]}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={isInputDisabled ? 'Messaging disabled for declined conversations' : 'Type a message...'}
                placeholderTextColor={colors.textLight}
                multiline
                editable={!isInputDisabled}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: isInputDisabled ? colors.textLight : primaryColor }
                ]}
                onPress={sendMessage}
                disabled={isInputDisabled || !newMessage.trim() || sending}
              >
                <Icon name="send" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Accept Client Confirmation Modal */}
      <Modal
        visible={showAcceptModal}
        animationType="fade"
        transparent
        onRequestClose={() => !accepting && setShowAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Accept as Client</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Accept {selectedConversation?.other_user_name} as a client? This unlocks scheduling, contracts, and birth plan sharing.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => !accepting && setShowAcceptModal(false)}
                disabled={accepting}
                style={styles.modalCancelButton}
                textStyle={styles.modalButtonText}
              />
              <Button
                title="Accept"
                variant="primary"
                size="md"
                loading={accepting}
                onPress={acceptClient}
                disabled={accepting}
                style={styles.modalConfirmButton}
                textStyle={styles.modalButtonText}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Client Confirmation Modal */}
      <Modal
        visible={showDeclineModal}
        animationType="fade"
        transparent
        onRequestClose={() => !declining && setShowDeclineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Decline Client</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Decline this conversation with {selectedConversation?.other_user_name}? They will be notified that the inquiry was declined.
            </Text>
            <TextInput
              style={[styles.declineInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }] as any}
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder="Optional reason (e.g., capacity, specialization mismatch)..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={2}
              editable={!declining}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => { setShowDeclineModal(false); setDeclineReason(''); }}
                disabled={declining}
                style={styles.modalCancelButton}
                textStyle={styles.modalButtonText}
              />
              <Button
                title={declining ? 'Declining...' : 'Decline'}
                variant="secondary"
                size="md"
                loading={declining}
                onPress={declineClient}
                disabled={declining}
                style={[styles.modalConfirmButton, { backgroundColor: colors.error }]}
                textStyle={styles.modalButtonText}
              />
            </View>
          </View>
        </View>
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

          {/* Search box */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search clients by name..."
              placeholderTextColor={colors.textLight}
              value={clientSearchQuery}
              onChangeText={setClientSearchQuery}
              autoCorrect={false}
              autoCapitalize="words"
              clearButtonMode="while-editing"
            />
            {!!clientSearchQuery && (
              <TouchableOpacity
                style={styles.searchClear}
                onPress={() => setClientSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* KeyboardAvoidingView keeps the message input above the keyboard
              instead of letting the typing pad cover it (Issue: covered input). */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView style={styles.newMessageContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.newMessageLabel, { color: colors.text }]}>Select Client</Text>

              {(() => {
                // Build the list to show: existing clients without conversations
                // plus the pre-selected client (if from lead params and not in list)
                const list = getFilteredClients();

                if (list.length === 0) {
                  return (
                    <Text style={[styles.noClientsText, { color: colors.textLight }]}>
                      {clientSearchQuery.trim()
                        ? 'No clients match your search.'
                        : 'All your clients already have conversations or no connected clients yet.'}
                    </Text>
                  );
                }
                return (
                  <View style={styles.clientList}>
                    {list.map(client => (
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
                );
              })()}

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
          </KeyboardAvoidingView>
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

  // --- Section headers ---
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  sectionHeader: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },

  // --- Conversation cards ---
  conversationCard: { marginBottom: SIZES.sm },
  newInquiryCard: {
    borderColor: colors.info + '50',
    backgroundColor: colors.infoLight + '0D',
  },
  conversationRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  avatarImage: { width: 48, height: 48, borderRadius: 24, marginRight: SIZES.md },
  conversationInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  nameRoleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  userName: { fontSize: SIZES.fontMd, fontWeight: '600', marginRight: SIZES.sm },
  roleBadge: { paddingHorizontal: SIZES.xs, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  roleText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  statusBadge: { paddingHorizontal: SIZES.xs, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  statusText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  lastMessage: { fontSize: SIZES.fontSm },
  metaColumn: { alignItems: 'flex-end' },
  timeText: { fontSize: SIZES.fontXs, marginBottom: 4 },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: SIZES.fontXs, fontWeight: '600' },

  // --- Modal chrome ---
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

  // --- Pre-acceptance action banner ---
  actionBanner: {
    flexDirection: 'column',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: SIZES.sm,
  },
  actionBannerText: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBannerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZES.sm,
  },
  actionButton: {
    flex: 1,
    maxWidth: 180,
  },
  actionButtonText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },

  // --- Declined notice ---
  declinedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderTopWidth: 1,
    gap: SIZES.xs,
  },
  declinedNoticeText: {
    fontSize: SIZES.fontSm,
    fontWeight: '500',
    flex: 1,
  },

  // --- New Message modal ---
  newMessageContent: { flex: 1, padding: SIZES.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderWidth: 1,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
  },
  searchIcon: { marginRight: SIZES.sm },
  searchInput: {
    flex: 1,
    fontSize: SIZES.fontMd,
    paddingVertical: Platform.OS === 'web' ? 8 : 0,
  },
  searchClear: { padding: SIZES.xs },
  newMessageLabel: { fontSize: SIZES.fontMd, fontWeight: '600', marginBottom: SIZES.sm, marginTop: SIZES.md },
  noClientsText: { fontSize: SIZES.fontMd, textAlign: 'center', padding: SIZES.xl },
  clientList: { gap: SIZES.sm },
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

  // --- Confirmation modals ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    maxWidth: 400,
    width: '100%',
    gap: SIZES.md,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: SIZES.fontSm,
    textAlign: 'center',
    lineHeight: 20,
  },
  declineInput: {
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontSm,
    borderWidth: 1,
    minHeight: 70,
    textAlignVertical: 'top',
    marginHorizontal: SIZES.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZES.md,
    marginTop: SIZES.sm,
  },
  modalCancelButton: {
    flex: 1,
    maxWidth: 150,
  },
  modalConfirmButton: {
    flex: 1,
    maxWidth: 150,
  },
  modalButtonText: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    textAlign: 'center',
  },
}));