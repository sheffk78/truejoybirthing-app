/**
 * ClientSearchPicker — searchable client selector with type-ahead
 *
 * Jeff 10/02: with dozens of clients, a plain dropdown/scroll-list forces
 * scrolling to find someone. This component shows a search-first input:
 * start typing a name, matching clients filter live, tap to select.
 * Falls back to showing the full list when the search box is empty.
 *
 * Used by: ProviderAppointments (new appointment), (midwife)/visits.tsx,
 * (midwife)/birth-summaries.tsx, ProviderContracts (new contract),
 * ProviderInvoices (new invoice).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Icon } from './Icon';
import { C, F } from '../constants/corpus';
import { SIZES } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

export interface PickerClient {
  client_id: string;
  name: string;
  picture?: string | null;
  edd?: string | null;
  linked_mom_id?: string | null;
}

interface ClientSearchPickerProps {
  clients: PickerClient[];
  selectedClientId: string;
  onSelect: (client: PickerClient) => void;
  /** primary brand color for selected state */
  primaryColor?: string;
  placeholder?: string;
  emptyText?: string;
  /** flat list style (visits/birth-summaries) vs grid card (contracts) */
  testIDPrefix?: string;
}

export default function ClientSearchPicker({
  clients,
  selectedClientId,
  onSelect,
  primaryColor = C.sage,
  placeholder = 'Search clients by name…',
  emptyText = 'No clients match your search.',
  testIDPrefix = 'client-search',
}: ClientSearchPickerProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = q
    ? clients.filter((c) => (c.name || '').toLowerCase().includes(q))
    : clients;

  return (
    <View>
      {/* Search input — the primary interaction (Jeff 10/02: type to find) */}
      <View style={[styles.searchBox, selectedClientId ? { borderColor: primaryColor } : null]}>
        <Icon name="search" size={18} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="words"
          clearButtonMode="while-editing"
          testID={`${testIDPrefix}-input`}
        />
        {!!query && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
        {/* Clear selection chip when a client is picked */}
        {selectedClientId ? (
          <TouchableOpacity
            style={[styles.clearSelection, { backgroundColor: primaryColor + '15' }]}
            onPress={() => onSelect({ client_id: '', name: '' } as PickerClient)}
            testID={`${testIDPrefix}-clear`}
          >
            <Icon name="close" size={14} color={primaryColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Results */}
      {filtered.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textLight }]}>
          {clients.length === 0 ? 'No connected clients yet.' : emptyText}
        </Text>
      ) : (
        <ScrollView
          style={styles.resultsList}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((client) => {
            const selected = client.client_id === selectedClientId;
            return (
              <TouchableOpacity
                key={client.client_id}
                style={[
                  styles.resultRow,
                  selected && { backgroundColor: primaryColor + '12', borderColor: primaryColor },
                ]}
                onPress={() => onSelect(client)}
                testID={`${testIDPrefix}-option-${client.client_id}`}
              >
                {client.picture ? (
                  <TexImage uri={client.picture} fallbackInitial={client.name} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: primaryColor + '20' }]}>
                    <Text style={[styles.avatarInitial, { color: primaryColor }]}>
                      {(client.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text
                    style={[
                      styles.resultName,
                      { color: selected ? primaryColor : colors.text },
                      selected && { fontFamily: F.uiBold },
                    ]}
                    numberOfLines={1}
                  >
                    {client.name}
                  </Text>
                  {!!client.edd && (
                    <Text style={[styles.resultEdd, { color: colors.textSecondary }]}>
                      Due: {client.edd}
                    </Text>
                  )}
                </View>
                {selected && <Icon name="checkmark-circle" size={20} color={primaryColor} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/** Tiny inline image with fallback (kept local to avoid prop drilling a loader) */
function TexImage({ uri, fallbackInitial }: { uri: string; fallbackInitial: string }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={getStyles(colors).avatarFallback}>
        <Text style={getStyles(colors).avatarInitial}>{(fallbackInitial || '?').charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  const { Image } = require('react-native');
  return (
    <Image
      source={{ uri }}
      style={getStyles(colors).avatarImage}
      onError={() => setFailed(true)}
    />
  );
}

import { StyleSheet } from 'react-native';

const getStyles = (colors: any) =>
  StyleSheet.create({
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, padding: 0 },
    clearSelection: {
      marginLeft: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultsList: {
      marginTop: 8,
      maxHeight: 220,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    resultInfo: { flex: 1, marginLeft: 10 },
    resultName: { fontSize: 15, fontFamily: F.ui },
    resultEdd: { fontSize: 11, marginTop: 2 },
    avatarFallback: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: { width: 34, height: 34, borderRadius: 17 },
    avatarInitial: { fontSize: 14, fontFamily: F.uiBold },
    emptyText: { marginTop: 10, fontSize: 13.5, textAlign: 'center', paddingVertical: 8 },
  });

export { Platform };