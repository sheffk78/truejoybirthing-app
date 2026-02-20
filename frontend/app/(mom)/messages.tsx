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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import wsClient from '../../src/utils/websocket';

interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_role: string;
  other_user_picture: string | null;
  last_message_content: string;
  last_message_time: string;
  unread_count: number;
  is_sender: boolean;
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
}

interface TeamMember {
  user_id: string;
  name: string;
  role: string;
  email: string;
  picture?: string;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const fetchConversations = async () => {
    try {
      const data = await apiRequest<{ conversations: Conversation[] }>(API_ENDPOINTS.MESSAGES_CONVERSATIONS);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
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

  const fetchInvoices = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.MOM_INVOICES);
      // Filter to pending/unpaid invoices only (exclude Paid and Cancelled)
      const pending = (data || []).filter((inv: any) => {
        const status = (inv.status || '').toLowerCase();
        return status === 'pending' || status === 'sent';
      });
      setPendingInvoices(pending);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.MOM_TEAM);
      // API returns array of { provider: {...}, profile: {...}, share_request: {...} }
      const members: TeamMember[] = [];
      
      if (Array.isArray(data)) {
        // New array format
        for (const item of data) {
          if (item.provider) {
            members.push({
              user_id: item.provider.user_id,
              name: item.provider.full_name,
              role: item.provider.role,
              email: item.provider.email || '',
              picture: item.profile?.picture || item.provider.picture,
            });
          }
        }
      } else {
        // Legacy object format (doula/midwife keys)
        if (data.doula) {
          members.push({
            user_id: data.doula.user_id,
            name: data.doula.name,
            role: 'DOULA',
            email: '',
            picture: data.doula.picture,
          });
        }
        if (data.midwife) {
          members.push({
            user_id: data.midwife.user_id,
            name: data.midwife.name,
            role: 'MIDWIFE',
            email: '',
            picture: data.midwife.picture,
          });
        }
      }
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team:', error);
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
  
  useEffect(() => {
    fetchConversations();
    fetchCurrentUser();
    fetchInvoices();
    
    // Connect to WebSocket for real-time messages
    if (sessionToken) {
      wsClient.connect(sessionToken);
      
      // Subscribe to new messages
      const unsubscribe = wsClient.subscribe('new_message', (data) => {
        // If currently in a conversation with the sender, add the message
        if (selectedConversation && data.message?.sender_id === selectedConversation.other_user_id) {
          setMessages((prev) => [...prev, {
            message_id: data.message.message_id,
            sender_id: data.message.sender_id,
            sender_name: data.message.sender_name,
            sender_role: data.message.sender_role,
            receiver_id: currentUserId,
            content: data.message.content,
            created_at: data.message.created_at,
            read: false,
          }]);
        }
        // Refresh conversation list to update unread counts
        fetchConversations();
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [sessionToken, selectedConversation?.other_user_id]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchConversations(), fetchInvoices()]);
    setRefreshing(false);
  };
  
  const openConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    try {
      const data = await apiRequest<{ messages: Message[] }>(
        `${API_ENDPOINTS.MESSAGES}/${conversation.other_user_id}`
      );
      setMessages(data.messages || []);
      // Refresh conversations to update unread count
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
      // Refresh messages
      const data = await apiRequest<{ messages: Message[] }>(
        `${API_ENDPOINTS.MESSAGES}/${selectedConversation.other_user_id}`
      );
      setMessages(data.messages || []);
      
      // Scroll to bottom
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
    return role === 'DOULA' ? COLORS.roleDoula : role === 'MIDWIFE' ? COLORS.roleMidwife : COLORS.primary;
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid="messages-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>Stay in touch with your care team</Text>
          </View>
          <TouchableOpacity 
            style={styles.newMessageButton} 
            onPress={openNewMessageModal}
            data-testid="new-message-btn"
          >
            <Icon name="create-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        {/* Pending Invoices Section */}
        {pendingInvoices.length > 0 && (
          <View style={styles.invoicesSection} data-testid="pending-invoices-section">
            <View style={styles.invoicesSectionHeader}>
              <Icon name="receipt-outline" size={20} color={COLORS.warning} />
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
                      ${invoice.amount?.toFixed(2) || '0.00'}
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
                      { backgroundColor: invoice.status === 'sent' ? COLORS.warning + '20' : COLORS.primary + '20' }
                    ]}>
                      <Text style={[
                        styles.invoiceStatusText,
                        { color: invoice.status === 'sent' ? COLORS.warning : COLORS.primary }
                      ]}>
                        {invoice.status === 'sent' ? 'Awaiting Payment' : 'Pending'}
                      </Text>
                    </View>
                    {invoice.due_date && (
                      <Text style={styles.invoiceDueDate}>
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
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
        
        {/* Conversations List */}
        {conversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="chatbubbles-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the button above to message someone on your team
            </Text>
            <Button
              title="Start a Conversation"
              onPress={openNewMessageModal}
              style={{ marginTop: SIZES.md }}
              icon={<Icon name="add" size={18} color={COLORS.white} />}
            />
          </Card>
        ) : (
          conversations.map((conv) => (
            <TouchableOpacity
              key={conv.other_user_id}
              onPress={() => openConversation(conv)}
              data-testid={`conversation-${conv.other_user_id}`}
            >
              <Card style={[styles.conversationCard, conv.unread_count > 0 && styles.unreadCard]}>
                <View style={styles.conversationRow}>
                  <View style={[styles.avatar, { backgroundColor: getRoleColor(conv.other_user_role) + '20' }]}>
                    <Icon 
                      name={conv.other_user_role === 'DOULA' ? 'heart' : conv.other_user_role === 'MIDWIFE' ? 'medkit' : 'person'} 
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
                      <View style={styles.unreadBadge}>
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
          {/* Chat Header */}
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
          
          {/* Messages */}
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
            
            {/* Input */}
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
                style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
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
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.chatHeaderTitle}>New Message</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.teamSelectionContent}>
            <Text style={styles.teamSelectionTitle}>Select a team member to message</Text>
            
            {loadingTeam ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : teamMembers.length === 0 ? (
              <View style={styles.noTeamContainer}>
                <Icon name="people-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.noTeamText}>No team members yet</Text>
                <Text style={styles.noTeamSubtext}>
                  Share your birth plan with a doula or midwife to add them to your team
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {teamMembers.map((member) => (
                  <TouchableOpacity
                    key={member.user_id}
                    style={styles.teamMemberCard}
                    onPress={() => startConversation(member)}
                    data-testid={`team-member-${member.user_id}`}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                      <Icon 
                        name={member.role === 'DOULA' ? 'heart' : 'medkit'} 
                        size={24} 
                        color={getRoleColor(member.role)} 
                      />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <View style={[styles.memberRoleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                        <Text style={[styles.memberRoleText, { color: getRoleColor(member.role) }]}>
                          {member.role}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  newMessageButton: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
    paddingHorizontal: SIZES.lg,
  },
  conversationCard: {
    marginBottom: SIZES.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
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
    fontFamily: FONTS.bodyBold,
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
    fontFamily: FONTS.bodyBold,
  },
  lastMessage: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
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
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
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
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  chatHeaderRole: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
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
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: SIZES.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  // Team selection modal styles
  teamSelectionContent: {
    flex: 1,
    padding: SIZES.md,
  },
  teamSelectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  noTeamSubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  memberName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  invoicesBadge: {
    backgroundColor: COLORS.warning,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicesBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  invoiceCard: {
    marginBottom: SIZES.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
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
    color: COLORS.textPrimary,
  },
  invoiceDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  invoiceFrom: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
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
    color: COLORS.textLight,
    marginTop: 4,
  },
  paymentInstructions: {
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paymentInstructionsLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  paymentInstructionsText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  invoiceDisclaimer: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
});
