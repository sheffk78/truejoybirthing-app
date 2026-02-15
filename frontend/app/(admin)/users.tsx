import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const ROLE_COLORS: Record<string, string> = {
  'MOM': COLORS.roleMom,
  'DOULA': COLORS.roleDoula,
  'MIDWIFE': COLORS.roleMidwife,
  'ADMIN': COLORS.roleAdmin,
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  
  const fetchUsers = async () => {
    try {
      let endpoint = API_ENDPOINTS.ADMIN_USERS;
      if (selectedRole) {
        endpoint += `?role=${selectedRole}`;
      }
      const data = await apiRequest(endpoint);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };
  
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await apiRequest(`${API_ENDPOINTS.ADMIN_USERS}/${userId}/role`, {
        method: 'PUT',
        body: { role: newRole },
      });
      await fetchUsers();
      Alert.alert('Success', `User role changed to ${newRole}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change role');
    }
  };
  
  const confirmRoleChange = (userId: string, currentRole: string) => {
    const roles = ['MOM', 'DOULA', 'MIDWIFE', 'ADMIN'].filter((r) => r !== currentRole);
    
    Alert.alert(
      'Change Role',
      'Select new role for this user',
      [
        ...roles.map((role) => ({
          text: role,
          onPress: () => handleChangeRole(userId, role),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleAdmin} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>{users.length} users total</Text>
        </View>
        
        {/* Role Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedRole === null && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedRole(null)}
          >
            <Text
              style={[
                styles.filterText,
                selectedRole === null && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {['MOM', 'DOULA', 'MIDWIFE', 'ADMIN'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.filterButton,
                selectedRole === role && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedRole(role)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedRole === role && styles.filterTextActive,
                ]}
              >
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* User List */}
        {users.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No users found</Text>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.user_id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitial}>
                    {user.full_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.full_name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              
              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: ROLE_COLORS[user.role] + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: ROLE_COLORS[user.role] },
                      ]}
                    >
                      {user.role}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    Joined {formatDate(user.created_at)}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.changeRoleButton}
                  onPress={() => confirmRoleChange(user.user_id, user.role)}
                >
                  <Text style={styles.changeRoleText}>Change Role</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
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
    marginBottom: SIZES.md,
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
  filterContainer: {
    marginBottom: SIZES.lg,
  },
  filterButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.white,
    marginRight: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.roleAdmin,
    borderColor: COLORS.roleAdmin,
  },
  filterText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  userCard: {
    marginBottom: SIZES.sm,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleAdmin + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  userInitial: {
    fontSize: SIZES.fontLg,
    fontWeight: '700',
    color: COLORS.roleAdmin,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  roleBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  roleText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  dateText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
  },
  changeRoleButton: {
    alignSelf: 'flex-start',
  },
  changeRoleText: {
    fontSize: SIZES.fontSm,
    color: COLORS.roleAdmin,
    fontWeight: '500',
  },
});
