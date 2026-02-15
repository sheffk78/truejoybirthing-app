import React from 'react';
import { Platform } from 'react-native';
import * as LucideIcons from 'lucide-react-native';

// Map Ionicons names to Lucide icons
const iconMap: { [key: string]: keyof typeof LucideIcons } = {
  // Heart and love
  'heart': 'Heart',
  'heart-outline': 'Heart',
  
  // Navigation
  'arrow-back': 'ArrowLeft',
  'arrow-forward': 'ArrowRight',
  'chevron-forward': 'ChevronRight',
  'chevron-back': 'ChevronLeft',
  'chevron-down': 'ChevronDown',
  'chevron-up': 'ChevronUp',
  
  // Documents
  'document-text': 'FileText',
  'document-text-outline': 'FileText',
  
  // People
  'people': 'Users',
  'people-outline': 'Users',
  'person': 'User',
  'person-outline': 'User',
  'person-circle': 'UserCircle',
  'person-circle-outline': 'UserCircle',
  
  // Calendar
  'calendar': 'Calendar',
  'calendar-outline': 'Calendar',
  
  // Settings
  'settings': 'Settings',
  'settings-outline': 'Settings',
  
  // Actions
  'checkmark': 'Check',
  'checkmark-circle': 'CheckCircle',
  'checkmark-circle-outline': 'CheckCircle',
  'close': 'X',
  'close-circle': 'XCircle',
  'close-circle-outline': 'XCircle',
  'add': 'Plus',
  'add-circle': 'PlusCircle',
  'add-circle-outline': 'PlusCircle',
  'remove': 'Minus',
  'remove-circle': 'MinusCircle',
  
  // Mail
  'mail': 'Mail',
  'mail-outline': 'Mail',
  
  // Lock
  'lock-closed': 'Lock',
  'lock-closed-outline': 'Lock',
  'lock-open': 'LockOpen',
  'lock-open-outline': 'LockOpen',
  
  // Home
  'home': 'Home',
  'home-outline': 'Home',
  
  // Search
  'search': 'Search',
  'search-outline': 'Search',
  
  // Menu
  'menu': 'Menu',
  'menu-outline': 'Menu',
  
  // Create/Edit
  'create': 'Edit',
  'create-outline': 'Edit',
  
  // Download
  'download': 'Download',
  'download-outline': 'Download',
  
  // Play
  'play': 'Play',
  'play-circle': 'PlayCircle',
  'play-circle-outline': 'PlayCircle',
  
  // Info
  'information': 'Info',
  'information-circle': 'Info',
  'information-circle-outline': 'Info',
  
  // Warning
  'warning': 'AlertTriangle',
  'warning-outline': 'AlertTriangle',
  'alert': 'AlertCircle',
  'alert-circle': 'AlertCircle',
  'alert-circle-outline': 'AlertCircle',
  
  // Time
  'time': 'Clock',
  'time-outline': 'Clock',
  
  // Location
  'location': 'MapPin',
  'location-outline': 'MapPin',
  
  // Ellipse
  'ellipse': 'Circle',
  'ellipse-outline': 'Circle',
  
  // Shield
  'shield': 'Shield',
  'shield-checkmark': 'ShieldCheck',
  
  // Eye
  'eye': 'Eye',
  'eye-outline': 'Eye',
  'eye-off': 'EyeOff',
  'eye-off-outline': 'EyeOff',
  
  // Video
  'videocam': 'Video',
  'videocam-outline': 'Video',
  
  // Bulb
  'bulb': 'Lightbulb',
  'bulb-outline': 'Lightbulb',
  
  // Log out
  'log-out': 'LogOut',
  'log-out-outline': 'LogOut',
  
  // Star
  'star': 'Star',
  'star-outline': 'Star',
  
  // Clipboard
  'clipboard': 'Clipboard',
  'clipboard-outline': 'Clipboard',
  
  // Book
  'book': 'Book',
  'book-outline': 'Book',
  
  // Sync/Refresh
  'sync': 'RefreshCw',
  'sync-outline': 'RefreshCw',
  'refresh': 'RefreshCw',
  'refresh-outline': 'RefreshCw',
  
  // Social/Google
  'logo-google': 'Globe',
  
  // Notifications
  'notifications': 'Bell',
  'notifications-outline': 'Bell',
  
  // Cash/Money
  'cash': 'DollarSign',
  'cash-outline': 'DollarSign',
  
  // Contract/Document
  'document': 'File',
  'documents': 'Files',
  'documents-outline': 'Files',
  
  // List
  'list': 'List',
  'list-outline': 'List',
  
  // Call/Phone
  'call': 'Phone',
  'call-outline': 'Phone',
  
  // Chat
  'chatbubble': 'MessageCircle',
  'chatbubble-outline': 'MessageCircle',
  'chatbubbles': 'MessagesSquare',
  'chatbubbles-outline': 'MessagesSquare',
  
  // Trash
  'trash': 'Trash2',
  'trash-outline': 'Trash2',
  
  // Share
  'share': 'Share2',
  'share-outline': 'Share2',
  
  // Analytics
  'analytics': 'BarChart2',
  'analytics-outline': 'BarChart2',
  
  // Medical
  'medical': 'Stethoscope',
  'medkit': 'Stethoscope',
  'medkit-outline': 'Stethoscope',
  
  // Body/Health
  'body': 'Activity',
  'body-outline': 'Activity',
  'pulse': 'Activity',
  'pulse-outline': 'Activity',
  'fitness': 'HeartPulse',
  'fitness-outline': 'HeartPulse',
  
  // Happy
  'happy': 'Smile',
  'happy-outline': 'Smile',
  'sad': 'Frown',
  'sad-outline': 'Frown',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', style }) => {
  // Get mapped icon name or default to Circle
  const lucideIconName = iconMap[name] || 'Circle';
  const LucideIcon = LucideIcons[lucideIconName as keyof typeof LucideIcons] as React.ComponentType<any>;
  
  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found, using default Circle`);
    const DefaultIcon = LucideIcons.Circle as React.ComponentType<any>;
    return <DefaultIcon size={size} color={color} style={style} />;
  }
  
  return <LucideIcon size={size} color={color} style={style} />;
};

export default Icon;
