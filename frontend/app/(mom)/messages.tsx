import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Image,
  Keyboard,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS, BRAND } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { useAuthStore } from '../../src/store/authStore';
import wsClient from '../../src/utils/websocket';
import HBand from '../../src/components/mom/HBand';
import TIcon from '../../src/components/TIcon';
import { C, F, BAND_MESSAGES, initialsOf } from '../../src/constants/designRefresh';

interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_role: string;
  other_user_picture: string | null;
  last_message_content: string;
  last_message_time: string;
  unread_count: number;
  is_sender: boolean;
  thread_id?: string;
  thread_status?: "pre_acceptance" | "accepted" | "declined" | null;
  source?: string;
  can_accept?: boolean;
  can_decline?: boolean;
}

interface Message {
  message_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  thread_id?: string;
}

interface TeamMember {
  user_id: string;
  name: string;
  role: string;
  email: string;
  picture?: string;
}

export default function MessagesScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string; openConversation?: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [newMessageSearchQuery, setNewMessageSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const currentUserIdRef = useRef<string>('');
  const isNearBottomRef = useRef(true);
  const selectedConversationRef = useRef<Conversation | null>(null);
  
  // Keep selectedConversationRef in sync so the WebSocket subscription callback
  // always reads the current value instead of a stale closure capture
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      const data = await apiRequest<{ conversations: Conversation[] }>(API_ENDPOINTS.MESSAGES_CONVERSATIONS);
      const convos = (data && data.conversations) ? data.conversations : [];
      setConversations(Array.isArray(convos) ? convos : []);
      setLoadError(null);
    } catch (error) {
      console.error('[Messages] Error fetching conversations:', error);
      setLoadError('Unable to load messages. Pull to refresh.');
    }
  };
  
  const fetchCurrentUser = async () => {
    // Use user_id from authStore instead of making a redundant AUTH_ME API call
    const { user } = useAuthStore.getState();
    if (user && user.user_id) {
      setCurrentUserId(user.user_id);
      currentUserIdRef.current = user.user_id;
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.MOM_INVOICES);
      // Filter to pending/unpaid invoices only (exclude Paid and Cancelled)
      const invoices = Array.isArray(data) ? data : (data?.invoices ? data.invoices : []);
      const pending = invoices.filter((inv: any) => {
        const status = (inv?.status || '').toLowerCase();
        return status === 'pending' || status === 'sent';
      });
      setPendingInvoices(pending);
    } catch (error) {
      console.error('[Messages] Error fetching invoices:', error);
      // Don't crash — just leave pending invoices empty
      setPendingInvoices([]);
    }
  };

  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.MOM_TEAM);
      console.log('[Messages] Team API response:', JSON.stringify(data));
      
      // API returns array of { provider: {...}, profile: {...}, share_request: {...} }
      const members: TeamMember[] = [];
      
      if (Array.isArray(data)) {
        // New array format
        console.log('[Messages] Data is array with length:', data.length);
        for (const item of data) {
          try {
            if (item && item.provider) {
              const member = {
                user_id: item.provider.user_id || '',
                name: item.provider.full_name || 'Unknown',
                role: item.provider.role || '',
                email: item.provider.email || '',
                picture: item.profile?.picture || item.provider.picture,
              };
              console.log('[Messages] Adding team member:', member.name, member.role);
              members.push(member);
            }
          } catch (itemError) {
            console.error('[Messages] Error processing team member item:', itemError);
          }
        }
      } else if (data && typeof data === 'object') {
        // Legacy object format (doula/midwife keys)
        console.log('[Messages] Data is object format');
        if (data.doula) {
          members.push({
            user_id: data.doula.user_id || '',
            name: data.doula.name || 'Unknown',
            role: 'DOULA',
            email: '',
            picture: data.doula.picture,
          });
        }
        if (data.midwife) {
          members.push({
            user_id: data.midwife.user_id || '',
            name: data.midwife.name || 'Unknown',
            role: 'MIDWIFE',
            email: '',
            picture: data.midwife.picture,
          });
        }
      }
      
      console.log('[Messages] Total team members:', members.length);
      setTeamMembers(members);
    } catch (error) {
      console.error('[Messages] Error fetching team:', error);
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const openNewMessageModal = () => {
    setShowNewMessageModal(true);
    fetchTeamMembers();
  };

  const startConversation = (member: TeamMember) => {
    setShowNewMessageModal(false);
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.other_user_id === member.user_id);
    if (existingConv) {
      openConversation(existingConv);
    } else {
      // Create a new conversation object
      const newConv: Conversation = {
        other_user_id: member.user_id,
        other_user_name: member.name,
        other_user_role: member.role,
        other_user_picture: member.picture || null,
        last_message_content: '',
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        is_sender: false,
      };
      setSelectedConversation(newConv);
      setMessages([]);
    }
  };
  
  const { sessionToken } = useAuthStore();
  
  // Connect WebSocket once on mount; subscribe separately so handler uses refs
  useEffect(() => {
    if (!sessionToken) return;
    
    try {
      wsClient.connect(sessionToken);
    } catch (wsConnectError) {
      console.error('[Messages] Error connecting WebSocket:', wsConnectError);
    }
    
    const unsubscribe = wsClient.subscribe('new_message', (data) => {
      try {
        if (!data || !data.message || !data.message.sender_id) return;
        if (selectedConversationRef.current && data.message.sender_id === selectedConversationRef.current.other_user_id) {
          const newMsg: Message = {
            message_id: data.message.message_id || '',
            sender_id: data.message.sender_id || '',
            sender_name: data.message.sender_name || '',
            sender_role: data.message.sender_role || '',
            receiver_id: currentUserIdRef.current,
            content: data.message.content || '',
            created_at: data.message.created_at || new Date().toISOString(),
            read: false,
          };
          // Deduplicate: don't add if message already exists (from HTTP refresh)
          setMessages((prev) => {
            if (prev.some(m => m.message_id === newMsg.message_id)) return prev;
            return [...prev, newMsg];
          });
        }
        // Refresh conversation list to update unread counts
        fetchConversations();
      } catch (wsError) {
        console.error('[Messages] Error handling WebSocket message:', wsError);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [sessionToken]);
  
  // Initial data fetch on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchConversations(),
          fetchCurrentUser(),
          fetchInvoices(),
        ]);
      } catch (error) {
        console.error('[Messages] Error during initial data fetch:', error);
      }
    };
    loadInitialData();
  }, []);
  
  // Handle deep link params: open conversation from push notification or marketplace
  useEffect(() => {
    if (!params.userId) return;
    // Wait until conversations are loaded, then find and open the matching one
    const targetUserId = params.userId as string;
    const existingConv = conversations.find(c => c.other_user_id === targetUserId);
    if (existingConv) {
      openConversation(existingConv);
      // Clear the param so it doesn't re-trigger on re-render
      router.setParams({ userId: undefined });
    }
  }, [params.userId, conversations]);
  
  // Fix 5.10: Intercept Android hardware back when a conversation is open,
  // so back closes the chat instead of navigating away from the screen
  useEffect(() => {
    if (!selectedConversation) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedConversation(null);
      return true;
    });
    return () => subscription.remove();
  }, [selectedConversation]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchConversations(), fetchInvoices()]);
    setRefreshing(false);
  };
  
  const openConversation = async (conversation: Conversation) => {
    if (!conversation || !conversation.other_user_id) {
      console.error('[Messages] Cannot open conversation: invalid conversation object', conversation);
      return;
    }
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setSendError(null);
    try {
      const data = await apiRequest<{
        messages: Message[];
        thread?: { thread_id: string; status: string; created_at: string; accepted_at?: string; can_accept?: boolean; can_decline?: boolean; decline_reason?: string };
      }>(
        `${API_ENDPOINTS.MESSAGES}/${conversation.other_user_id}`
      );
      const msgs = (data && data.messages) ? data.messages : [];
      setMessages(Array.isArray(msgs) ? msgs : []);

      // If thread data is returned, merge it into the conversation
      if (data?.thread) {
        setSelectedConversation((prev) => prev ? {
          ...prev,
          thread_id: data.thread?.thread_id,
          thread_status: data.thread?.status as any,
        } : prev);
      }

      // Refresh conversations to update unread count
      fetchConversations();
    } catch (error) {
      console.error('[Messages] Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    const messageText = newMessage.trim();
    setSending(true);
    setSendError(null);
    setNewMessage('');
    
    try {
      const response = await apiRequest<{ message: string; data: Message }>(API_ENDPOINTS.MESSAGES, {
        method: 'POST',
        body: {
          receiver_id: selectedConversation.other_user_id,
          content: messageText,
        },
      });
      
      // Add the sent message from the API response (avoids full re-fetch + deduplication issues)
      // Backend returns { message: "Message sent", data: <message_doc> }
      const sentMessage = response?.data || response?.message;
      if (sentMessage && typeof sentMessage === 'object' && sentMessage.message_id) {
        setMessages((prev) => {
          if (prev.some(m => m.message_id === sentMessage.message_id)) return prev;
          return [...prev, sentMessage];
        });
      } else {
        // Fallback: optimistic append so the sent message is visible immediately
        const optimistic: Message = {
          message_id: `local_${Date.now()}`,
          sender_id: currentUserId,
          sender_name: '',
          sender_role: '',
          receiver_id: selectedConversation.other_user_id,
          content: messageText,
          read: true,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
      }
      
      // Scroll to bottom
      setTimeout(() => {
        try {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
          console.error('[Messages] Error scrolling to bottom:', e);
        }
      }, 100);
      
      // Refresh conversation list for last_message update
      fetchConversations();
    } catch (error: any) {
      console.error('[Messages] Error sending message:', error);
      setNewMessage(messageText); // Restore message text so user can retry
      setSendError('Failed to send. Tap to retry.');
    } finally {
      setSending(false);
    }
  };
  
  const formatTime = (dateStr: string | null | undefined) => {
    try {
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
    } catch (e) {
      console.error('[Messages] Error formatting time:', e);
      return '';
    }
  };
  
  const getRoleColor = (role: string) => {
    return role === 'DOULA' ? colors.roleDoula : role === 'MIDWIFE' ? colors.roleMidwife : role === 'LACTATION' ? colors.roleLactation : colors.primary;
  };

  const closeConversation = () => {
    Keyboard.dismiss();
    setSelectedConversation(null);
    setNewMessage('');
    fetchConversations();
  };
  
  return (
    <ErrorBoundary
      fallback={
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.fallbackContainer}>
            <Icon name="chatbubbles-outline" size={48} color={colors.textLight} />
            <Text style={styles.fallbackTitle}>Unable to Load Messages</Text>
            <Text style={styles.fallbackSubtext}>
              Something went wrong. Pull down to refresh or try again later.
            </Text>
            <Button
              title="Try Again"
              onPress={() => {
                fetchConversations();
                fetchCurrentUser();
                fetchInvoices();
              }}
              style={{ marginTop: SIZES.md }}
              icon={<Icon name="refresh" size={18} color={colors.white} />}
            />
          </View>
        </SafeAreaView>
      }
      onError={(error) => {
        console.error('[Messages Screen] Render error caught by ErrorBoundary:', error);
      }}
    >
    <SafeAreaView style={styles.container} edges={['top']} data-testid="messages-screen">
      {selectedConversation ? (
        /* Inline chat view — tab bar stays visible below */
        <View style={styles.chatInlineContainer}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={closeConversation} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} data-testid="close-chat-btn">
              <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName}>{selectedConversation.other_user_name}</Text>
              <Text style={styles.chatHeaderRole}>{selectedConversation.other_user_role}</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          {/* Pre-acceptance Banner */}
          {selectedConversation.thread_status === 'pre_acceptance' && (
            <View style={styles.preAcceptanceBanner}>
              <Icon name="information-circle-outline" size={16} color={colors.warning} />
              <Text style={styles.preAcceptanceBannerText}>
                {selectedConversation.other_user_name} hasn't accepted you as a client yet. You can still chat to get to know each other!
              </Text>
            </View>
          )}

          {/* Messages */}
          <KeyboardAvoidingView 
            style={styles.chatContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
          >
            {loadingMessages ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              onScroll={(e) => {
                const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                const threshold = 100;
                isNearBottomRef.current = 
                  layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;
              }}
              onContentSizeChange={() => {
                if (isNearBottomRef.current) {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                }
              }}
            >
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <View 
                    key={msg.message_id} 
                    style={[styles.messageWrapper, isMe && styles.messageWrapperMe]}
                  >
                    <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                      <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{msg.content}</Text>
                      <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                        {formatTime(msg.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            )}
            
            {/* Input */}
            <View style={styles.inputContainer}>
              {sendError && (
                <TouchableOpacity onPress={() => { setSendError(null); sendMessage(); }} style={styles.sendError}>
                  <Text style={styles.sendErrorText}>{sendError}</Text>
                </TouchableOpacity>
              )}
              {selectedConversation.thread_status === 'declined' ? (
                <View style={styles.declinedInputOverlay}>
                  <Text style={styles.declinedInputText}>
                    This provider is unable to work together at this time.
                  </Text>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.messageInput}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textLight}
                    multiline
                    maxLength={1000}
                    data-testid="message-input"
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    data-testid="send-message-btn"
                  >
                    <Icon name="paper-plane" size={20} color={colors.white} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : (
        /* Conversation list view */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Approved S9 header — photo band + overline + Cormorant H1 (mockup m-head) */}
          <HBand source={BAND_MESSAGES} height={168 + insets.top} focus="50% 30%" />
          <View style={s9.mhead}>
            <Text style={s9.overline}>Conversations</Text>
            <Text style={s9.h1}>
              <Text style={s9.h1em}>Your</Text> Messages
            </Text>
            <Text style={s9.msub}>Quiet questions, quick answers — with your team</Text>
          </View>

          {/* Search pill (mockup .search) */}
          <TouchableOpacity
            style={s9.search}
            onPress={openNewMessageModal}
            activeOpacity={0.85}
            data-testid="new-message-btn"
          >
            <TIcon name="about_me" size={16} color={C.grayLight} strokeWidth={1.7} />
            <Text style={s9.searchTxt}>Search by name or role…</Text>
          </TouchableOpacity>
          
          {/* Load Error Banner */}
          {loadError && conversations.length === 0 && (
            <Card style={styles.fallbackContainer}>
              <Icon name="alert-circle-outline" size={36} color={colors.error} />
              <Text style={styles.fallbackTitle}>Unable to Load Messages</Text>
              <Text style={styles.fallbackSubtext}>{loadError}</Text>
              <Button
                title="Retry"
                onPress={() => {
                  setLoadError(null);
                  fetchConversations();
                }}
                style={{ marginTop: SIZES.md }}
                icon={<Icon name="refresh" size={18} color={colors.white} />}
              />
            </Card>
          )}
          
          {/* Pending Invoices Section */}
          {pendingInvoices.length > 0 && (
            <View style={styles.invoicesSection} data-testid="pending-invoices-section">
              <View style={styles.invoicesSectionHeader}>
                <Icon name="receipt-outline" size={20} color={colors.warning} />
                <Text style={styles.invoicesSectionTitle}>Pending Invoices</Text>
                <View style={styles.invoicesBadge}>
                  <Text style={styles.invoicesBadgeText}>{pendingInvoices.length}</Text>
                </View>
              </View>
              {pendingInvoices.map((invoice: any) => (
                <Card 
                  key={invoice.invoice_id} 
                  style={styles.invoiceCard}
                  data-testid={`invoice-${invoice.invoice_id}`}
                >
                  <View style={styles.invoiceRow}>
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceAmount}>
                        ${typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : '0.00'}
                      </Text>
                      <Text style={styles.invoiceDescription} numberOfLines={1}>
                        {invoice.description || 'Invoice'}
                      </Text>
                      <Text style={styles.invoiceFrom}>
                        From: {invoice.provider_name || 'Your Provider'}
                      </Text>
                    </View>
                    <View style={styles.invoiceMeta}>
                      <View style={[
                        styles.invoiceStatusBadge,
                        { backgroundColor: invoice.status === 'sent' ? colors.warning + '20' : colors.primary + '20' }
                      ]}>
                        <Text style={[
                          styles.invoiceStatusText,
                          { color: invoice.status === 'sent' ? colors.warning : colors.primary }
                        ]}>
                          {invoice.status === 'sent' ? 'Awaiting Payment' : 'Pending'}
                        </Text>
                      </View>
                      {invoice.due_date && (
                        <Text style={styles.invoiceDueDate}>
                          Due: {(() => { try { return new Date(invoice.due_date).toLocaleDateString(); } catch { return ''; } })()}
                        </Text>
                      )}
                    </View>
                  </View>
                  {invoice.payment_instructions && (
                    <View style={styles.paymentInstructions}>
                      <Text style={styles.paymentInstructionsLabel}>Payment Instructions:</Text>
                      <Text style={styles.paymentInstructionsText}>{invoice.payment_instructions}</Text>
                    </View>
                  )}
                </Card>
              ))}
              <Text style={styles.invoiceDisclaimer}>
                Payments are made directly to your provider. True Joy Birthing does not process payments.
              </Text>
            </View>
          )}
          
          {/* Recent conversations — approved srow construction (mockup S9) */}
          {conversations.length === 0 ? (
            <View style={s9.sect}>
              <Text style={s9.h2}>Recent</Text>
              <Text style={s9.sub}>No messages yet</Text>
              <TouchableOpacity
                style={s9.srow}
                onPress={openNewMessageModal}
                activeOpacity={0.85}
                data-testid="start-conversation-btn"
              >
                <View style={s9.sico}>
                  <TIcon name="messages" size={22} color={C.lavender} strokeWidth={1.7} />
                </View>
                <View style={s9.smid}>
                  <Text style={s9.h3}>Message your team</Text>
                  <View style={s9.smetaRow}>
                    <Text style={s9.mmeta}>Reach anyone on your team — no forms, no phone tag</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s9.sect}>
              <Text style={s9.h2}>Recent</Text>
              <Text style={s9.sub}>
                {(() => {
                  const unread = conversations.reduce((n, c) => n + (c.unread_count > 0 ? 1 : 0), 0);
                  return unread === 0
                    ? 'All caught up'
                    : unread === 1
                      ? '1 unread'
                      : `${unread} unread`;
                })()}
              </Text>
              {conversations.map((conv, idx) => {
                const tint = avatarTintS9(idx);
                const initials = conv.other_user_picture
                  ? ''
                  : initialsOf(conv.other_user_name) || '?';
                return (
                  <TouchableOpacity
                    key={conv.other_user_id}
                    style={s9.srow}
                    onPress={() => openConversation(conv)}
                    activeOpacity={0.85}
                    data-testid={`conversation-${conv.other_user_id}`}
                  >
                    {conv.other_user_picture ? (
                      <Image
                        source={{ uri: conv.other_user_picture }}
                        style={s9.avatImg}
                      />
                    ) : (
                      <View style={[s9.avat, { backgroundColor: tint.bg }]}>
                        <Text style={[s9.avatTxt, { color: tint.fg }]}>{initials}</Text>
                      </View>
                    )}
                    <View style={s9.smid}>
                      <Text style={s9.h3}>{conv.other_user_name}</Text>
                      <View style={s9.smetaRow}>
                        <View style={[s9.schip, s9.schipWip]}>
                          <Text style={[s9.schipTxt, s9.schipTxtWip]}>
                            {conv.other_user_role}
                          </Text>
                        </View>
                        {conv.thread_status === 'pre_acceptance' && (
                          <Text style={s9.mmeta}>Getting to know each other</Text>
                        )}
                        {conv.thread_status === 'accepted' && null}
                      </View>
                      <Text style={s9.lastMsg} numberOfLines={1}>
                        {conv.is_sender ? 'You: ' : ''}
                        {conv.last_message_content}
                      </Text>
                    </View>
                    <View style={s9.metaCol}>
                      <Text style={s9.time}>{formatTime(conv.last_message_time)}</Text>
                      {conv.unread_count > 0 && <View style={s9.unreadDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Start a conversation — approved mockup section (S9) */}
      {conversations.length > 0 && !selectedConversation && (
        <View style={s9.sect} data-testid="start-conversation-section">
          <Text style={s9.h2}>Start a conversation</Text>
          <Text style={s9.sub}>Reach anyone on your team — no forms, no phone tag</Text>
          <TouchableOpacity
            style={s9.srow}
            onPress={openNewMessageModal}
            activeOpacity={0.85}
            data-testid="start-conversation-btn"
          >
            <View style={s9.sico}>
              <TIcon name="messages" size={22} color={C.lavender} strokeWidth={1.7} />
            </View>
            <View style={s9.smid}>
              <Text style={s9.h3}>Message your team</Text>
              <View style={s9.smetaRow}>
                <Text style={s9.mmeta}>
                  {teamMembers.length > 0
                    ? `${teamMembers
                        .slice(0, 3)
                        .map((m) => m.name.split(/\s+/)[0])
                        .join(', ')} ${teamMembers.length > 3 ? 'and more' : ''} are a tap away`
                    : 'Anyone on your team is a tap away'}
                </Text>
              </View>
            </View>
            <TIcon name="status_done" size={15} color={C.chev} strokeWidth={1.7} />
          </TouchableOpacity>
        </View>
      )}

      {/* New Message Modal - Select Team Member */}
      <Modal
        visible={showNewMessageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewMessageModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowNewMessageModal(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.chatHeaderName}>New Message</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.teamSelectionContent}>
            <Text style={styles.teamSelectionTitle}>Select a team member to message</Text>

            <View style={styles.teamSearchInputWrapper}>
              <Icon name="search-outline" size={18} color={colors.textLight} />
              <TextInput
                style={styles.teamSearchInput}
                value={newMessageSearchQuery}
                onChangeText={setNewMessageSearchQuery}
                placeholder="Search by name or role..."
                placeholderTextColor={colors.textLight}
                data-testid="team-search-input"
              />
            </View>

            {loadingTeam ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : teamMembers.length === 0 ? (
              <View style={styles.noTeamContainer}>
                <Icon name="people-outline" size={48} color={colors.textLight} />
                <Text style={styles.noTeamText}>No team members yet</Text>
                <Text style={styles.noTeamSubtext}>
                  Share your birth plan with a doula or midwife to add them to your team
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {teamMembers
                  .filter((member) => {
                    const q = newMessageSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      member.name.toLowerCase().includes(q) ||
                      member.role.toLowerCase().includes(q)
                    );
                  })
                  .map((member) => (
                  <TouchableOpacity
                    key={member.user_id}
                    style={styles.teamMemberCard}
                    onPress={() => startConversation(member)}
                    data-testid={`team-member-${member.user_id}`}
                  >
                    {member.picture ? (
                      <Image 
                        source={{ uri: member.picture }} 
                        style={styles.memberAvatarImage}
                      />
                    ) : (
                      <View style={[styles.memberAvatar, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                        <Icon 
                          name={member.role === 'DOULA' ? 'heart' : 'medkit'} 
                          size={24} 
                          color={getRoleColor(member.role)} 
                        />
                      </View>
                    )}
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <View style={[styles.memberRoleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                        <Text style={[styles.memberRoleText, { color: getRoleColor(member.role) }]}>
                          {member.role}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-forward" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </ErrorBoundary>
  );
}

// Avatar tint rotates rose → lavender → sage (mockup order)
const avatarTintS9 = (i: number) => {
  const tints = [
    { bg: C.roseBg, fg: C.rose },
    { bg: C.lavenderBg, fg: C.lavender },
    { bg: C.sageBg, fg: C.sage },
  ];
  return tints[i % tints.length];
};

// s9 — approved S9 mockup styles (s7s8s9-mom-core-hbands.html, verbatim hexes from C)
const s9 = StyleSheet.create({
  mhead: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  overline: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: C.rose,
    marginBottom: 5,
  },
  h1: { fontFamily: F.serif, fontWeight: '700', fontSize: 26, lineHeight: 30, color: C.ink },
  h1em: { fontFamily: F.serif, fontWeight: '700', color: C.roseSoft },
  msub: { fontSize: 12.5, color: C.gray, marginTop: 4, fontWeight: '500' },

  search: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: C.white,
    borderColor: C.roseBg,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchTxt: { fontSize: 12, color: C.grayLight, fontWeight: '500' },

  sect: { paddingHorizontal: 20, marginTop: 14 },
  h2: { fontFamily: F.serif, fontWeight: '700', fontSize: 21, color: C.ink, marginBottom: 2 },
  sub: { fontSize: 11.5, color: C.gray, marginBottom: 8, fontWeight: '500' },

  srow: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avat: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatImg: { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
  avatTxt: { fontSize: 14, fontWeight: '700' },
  smid: { flex: 1, minWidth: 0 },
  h3: { fontFamily: F.serifSemi, fontWeight: '600', fontSize: 17, color: C.ink },
  smetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  mmeta: { fontSize: 11, color: C.gray, fontWeight: '500', flexShrink: 1 },
  lastMsg: { fontSize: 11.5, color: C.gray, marginTop: 2, fontWeight: '500' },

  schip: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  schipTxt: { fontSize: 9.5, letterSpacing: 0.6, fontWeight: '700', textTransform: 'uppercase' },
  schipWip: { backgroundColor: C.lavenderBg },
  schipTxtWip: { color: C.lavender },

  sico: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.lavenderBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  metaCol: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  time: { fontSize: 10, color: C.grayLight, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.roseBorder },
});

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  fallbackTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginTop: SIZES.md,
  },
  fallbackSubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
    paddingHorizontal: SIZES.lg,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  header: {
    marginBottom: SIZES.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  newMessageButton: {
    backgroundColor: colors.primary,
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
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
    paddingHorizontal: SIZES.lg,
  },
  conversationCard: {
    marginBottom: SIZES.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
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
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontFamily: FONTS.bodyBold,
    color: colors.text,
    marginRight: SIZES.sm,
  },
  roleBadge: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm,
  },
  roleText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  lastMessage: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  metaColumn: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: SIZES.fontXs,
    color: colors.textLight,
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: colors.white,
  },
  chatInlineContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
  },
  chatHeaderRole: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    lineHeight: 20,
  },
  messageTextMe: {
    color: colors.white,
  },
  messageTime: {
    fontSize: SIZES.fontXs,
    color: colors.textLight,
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
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    maxHeight: 100,
    marginRight: SIZES.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  // Team selection modal styles
  teamSelectionContent: {
    flex: 1,
    padding: SIZES.md,
  },
  teamSelectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: SIZES.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTeamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
  },
  noTeamText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginTop: SIZES.md,
  },
  noTeamSubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  memberName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
  },
  memberRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  memberRoleText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  // Invoice section styles
  invoicesSection: {
    marginBottom: SIZES.lg,
  },
  invoicesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  invoicesSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  invoicesBadge: {
    backgroundColor: colors.warning,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicesBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: colors.white,
  },
  invoiceCard: {
    marginBottom: SIZES.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceAmount: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  invoiceDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invoiceFrom: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginTop: 4,
  },
  invoiceMeta: {
    alignItems: 'flex-end',
  },
  invoiceStatusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  invoiceStatusText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  invoiceDueDate: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginTop: 4,
  },
  paymentInstructions: {
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentInstructionsLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paymentInstructionsText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.text,
    lineHeight: 18,
  },
  invoiceDisclaimer: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
  sendError: {
    backgroundColor: colors.error + '15',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  sendErrorText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.error,
    textAlign: 'center',
  },
  // Pre-acceptance banner
  preAcceptanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    backgroundColor: colors.warning + '15',
    marginHorizontal: SIZES.md,
    marginTop: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  preAcceptanceBannerText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.warning,
    lineHeight: 20,
  },
  // Declined input overlay
  declinedInputOverlay: {
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declinedInputText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Thread status badge
  threadStatusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm,
    marginLeft: SIZES.xs,
  },
  threadStatusText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  // Team selection modal search
  teamSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamSearchInput: {
    flex: 1,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
}));
