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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

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

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
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
  
  useEffect(() => {
    fetchConversations();
    fetchCurrentUser();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
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
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Stay in touch with your care team</Text>
        </View>
        
        {/* Conversations List */}
        {conversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="chatbubbles-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Contact a provider from the Marketplace to start a conversation
            </Text>
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
                <Icon name="send" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
});
