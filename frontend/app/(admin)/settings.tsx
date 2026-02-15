import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES } from '../../src/constants/theme';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Icon name="person-circle-outline" size={80} color={COLORS.roleAdmin} />
          </View>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Icon name="shield" size={14} color={COLORS.white} />
            <Text style={styles.roleText}>Admin</Text>
          </View>
        </View>
        
        {/* App Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>App Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name</Text>
            <Text style={styles.infoValue}>True Joy Birthing</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0 MVP</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Environment</Text>
            <Text style={styles.infoValue}>Development</Text>
          </View>
        </Card>
        
        {/* Features */}
        <Card style={styles.featuresCard}>
          <Text style={styles.cardTitle}>MVP Features</Text>
          
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.featureText}>User Authentication (Email + Google)</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.featureText}>Role-based Access Control</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.featureText}>Birth Plan Builder (Mom)</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.featureText}>Client Management (Doula/Midwife)</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="ellipse-outline" size={20} color={COLORS.warning} />
            <Text style={styles.featureText}>E-Signature (Mocked)</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="ellipse-outline" size={20} color={COLORS.warning} />
            <Text style={styles.featureText}>PDF Export (Mocked)</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="close-circle-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.featureText}>Payment Integration (Skipped for MVP)</Text>
          </View>
        </Card>
        
        {/* Placeholders */}
        <Card style={styles.placeholderCard}>
          <Text style={styles.cardTitle}>Future Settings</Text>
          <Text style={styles.placeholderText}>
            Feature flags, subscription product IDs, and other global settings will be configured here in future releases.
          </Text>
        </Card>
        
        {/* Logout */}
        <Button
          title="Log Out"
          onPress={handleLogout}
          variant="outline"
          fullWidth
          style={styles.logoutButton}
        />
      </ScrollView>
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
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  avatarContainer: {
    marginBottom: SIZES.sm,
  },
  userName: {
    fontSize: SIZES.fontXl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roleAdmin,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginTop: SIZES.sm,
  },
  roleText: {
    color: COLORS.white,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  infoCard: {
    marginBottom: SIZES.md,
  },
  cardTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  featuresCard: {
    marginBottom: SIZES.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  featureText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  placeholderCard: {
    marginBottom: SIZES.md,
    backgroundColor: COLORS.roleAdmin + '10',
  },
  placeholderText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: SIZES.lg,
  },
});
