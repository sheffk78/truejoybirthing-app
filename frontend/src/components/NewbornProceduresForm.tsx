/**
 * Informed-Choice decision cards — the "Newborn Procedures" birth-plan section (Phase 4).
 *
 * Data model (matches backend `decisions: {procedure_id: {choice, option, decided_at, doc_id}}`):
 *   choice ∈ 'opt_in' | 'opt_out' | 'undecided'; vitamin K additionally takes
 *   `option: 'oral' | 'shot'` (3-way decision, Jeff 2026-09-24 #2).
 *
 * Behavior (Chante feedback 2026-09-24):
 *   • Mom's state auto-fills from her profile (location_state) — never re-asked (point 1).
 *   • Each decline opens the state's official declination form when one exists;
 *     otherwise it prepares the informed-choice master document (point 2).
 *   • Plain-language cards: what it is, then "I choose this" / "I decline this".
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useColors, ThemeColors } from '../hooks/useThemedStyles';
import { apiRequest } from '../utils/api';
import { API_ENDPOINTS } from '../constants/api';

// The 8 decision items — order and ids mirror the state data schema and the
// backend informed-choice master document.
const PROCEDURES: Array<{ id: string; label: string; hint: string }> = [
  {
    id: 'metabolic_screening',
    label: 'Newborn Metabolic Screening ("blood spot")',
    hint: "A few drops from baby's heel, usually 24–48 hours after birth. Checks for rare but serious conditions that are treatable when found early.",
  },
  {
    id: 'hearing_screening',
    label: 'Newborn Hearing Screening',
    hint: "A quick, painless test of baby's hearing, often done while baby sleeps.",
  },
  {
    id: 'cchd_screening',
    label: 'Heart Screening (CCHD pulse-ox)',
    hint: "A small sensor on baby's skin measures oxygen levels to rule out serious heart conditions.",
  },
  {
    id: 'erythromycin_eye_ointment',
    label: 'Eye Ointment (Erythromycin)',
    hint: "Antibiotic ointment placed in baby's eyes shortly after birth to prevent infection. Some states require it by law; others allow a signed decline.",
  },
  {
    id: 'vitamin_k',
    label: 'Vitamin K',
    hint: 'Helps prevent serious bleeding in the first weeks of life. Three paths: oral doses, one shot, or decline.',
  },
  {
    id: 'hepatitis_b_vaccine',
    label: 'Hepatitis B Birth Dose',
    hint: 'The first vaccine, offered in the days after birth.',
  },
  {
    id: 'gestational_diabetes',
    label: 'Gestational Diabetes Screening (during pregnancy)',
    hint: 'A glucose drink and blood draw in late pregnancy to see how your body handles sugar.',
  },
  {
    id: 'group_b_strep',
    label: 'Group B Strep Screening (during pregnancy)',
    hint: 'A gentle swab near the end of pregnancy. If it comes back positive, IV antibiotics during labor are offered.',
  },
];

const VITAMIN_K_OPTIONS = [
  { id: 'oral', label: 'Oral doses' },
  { id: 'shot', label: 'One shot' },
] as const;

type Decision = {
  choice?: 'opt_in' | 'opt_out' | 'undecided';
  option?: string;
  decided_at?: string;
  doc_id?: string;
};
type Decisions = Record<string, Decision>;
type ProcedureResource = {
  opt_out_form?: string | null;
  state_form_note?: string | null;
  program_contact?: string | null;
};
type StateResource = {
  state?: string;
  state_name?: string;
  procedures?: Record<string, ProcedureResource>;
};

export default function NewbornProceduresForm({
  data,
  onChange,
}: {
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const colors = useColors();
  const [stateName, setStateName] = useState<string | null>(null);
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [stateProcedures, setStateProcedures] = useState<Record<string, ProcedureResource>>({});
  const [loading, setLoading] = useState(true);
  const [docBusy, setDocBusy] = useState<string | null>(null);
  const [docInfo, setDocInfo] = useState<string | null>(null);
  const decisions: Decisions = (data?.decisions as Decisions) || {};

  // Mom's home state auto-fills from her profile — she is never re-asked (Chante point 1).
  // Unknown state or a state without configured data falls back to generic cards; the
  // informed-choice master document still covers her.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const profile = await apiRequest<{ location_state?: string }>(API_ENDPOINTS.MOM_PROFILE);
        if (!alive) return;
        const st = (profile?.location_state || '').trim().toUpperCase() || null;
        if (st) {
          setStateCode(st);
          try {
            const res = await apiRequest<StateResource>(
              `${API_ENDPOINTS.STATE_RESOURCES}/${st}`
            );
            if (!alive) return;
            setStateName(res?.state_name || st);
            setStateProcedures(res?.procedures || {});
          } catch {
            // State not configured (or fetch failed) — generic informed-choice cards.
          }
        }
      } catch {
        // Profile unavailable — generic informed-choice cards.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setDecision = (procedureId: string, patch: Decision) => {
    const next: Decisions = {
      ...decisions,
      [procedureId]: {
        ...decisions[procedureId],
        ...patch,
        decided_at: new Date().toISOString(),
      },
    };
    onChange('decisions', next);
  };

  const createDoc = async (procedureId: string) => {
    if (!stateCode) {
      setDocInfo(
        'Your choices are saved with your birth plan. Your informed-choice document will be prepared with your midwife.'
      );
      return;
    }
    setDocBusy(procedureId);
    try {
      const res = await apiRequest<{ doc_id?: string }>(
        `${API_ENDPOINTS.INFORMED_CHOICE}/${stateCode}/create`,
        {
          method: 'POST',
          body: {
            client_id: 'self',
            client_name: 'My Birth Team',
            midwife_id: 'mine',
            midwife_name: 'My Midwife',
            decisions: Object.fromEntries(
              Object.entries(decisions)
                .filter(([, v]) => v?.choice)
                .map(([k, v]) => [
                  k,
                  { choice: v.choice, ...(v.option ? { option: v.option } : {}) },
                ])
            ),
          },
        }
      );
      setDecision(procedureId, { ...decisions[procedureId], doc_id: res?.doc_id });
      setDocInfo(
        'Saved. Your informed-choice document is in your file — your midwife countersigns it at your next visit.'
      );
    } catch {
      setDocInfo(
        "Your choices below are saved with your birth plan. The document couldn't be created just now — you can try again later."
      );
    } finally {
      setDocBusy(null);
    }
  };

  const handleDecline = (procedureId: string) => {
    const formUrl = stateProcedures?.[procedureId]?.opt_out_form;
    if (formUrl) {
      Linking.openURL(formUrl).catch(() => {});
      return;
    }
    void createDoc(procedureId);
  };

  if (loading) {
    return (
      <View style={styles.wrap} testID="newborn-procedures-loading">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.intro, { color: colors.text }]}>
        These are the routine screenings and treatments offered to newborns — and to you during
        pregnancy. Every one of them is your choice. Reviewing each and telling your care team
        what you decide is called "informed choice."
      </Text>

      <View
        style={[styles.stateBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.stateBannerText, { color: colors.textSecondary }]}>
          {stateName
            ? `Official information and forms for ${stateName} are linked on each card.`
            : "Your state's official forms aren't linked yet. Each card below is still a fully informed choice — your document will record it."}
        </Text>
      </View>

      {PROCEDURES.map((proc) => {
        const d = decisions[proc.id] || {};
        const hasStateForm = Boolean(stateProcedures?.[proc.id]?.opt_out_form);
        return (
          <View
            key={proc.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardLabel, { color: colors.text }]}>{proc.label}</Text>
            <Text style={[styles.cardHint, { color: colors.textSecondary }]}>{proc.hint}</Text>

            {proc.id === 'vitamin_k' && d.choice === 'opt_in' && (
              <View style={styles.vkRow}>
                {VITAMIN_K_OPTIONS.map((opt) => {
                  const active = d.option === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      testID={`vitamin-k-${opt.id}`}
                      onPress={() => setDecision('vitamin_k', { choice: 'opt_in', option: opt.id })}
                      style={[
                        styles.vkChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primaryLight : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.vkChipText,
                          { color: active ? colors.primaryDark : colors.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.choiceRow}>
              <ChoiceButton
                label="I choose this"
                active={d.choice === 'opt_in'}
                tone="accept"
                onPress={() => setDecision(proc.id, { choice: 'opt_in' })}
                colors={colors}
              />
              <ChoiceButton
                label="I decline this"
                active={d.choice === 'opt_out'}
                tone="decline"
                onPress={() => setDecision(proc.id, { choice: 'opt_out' })}
                colors={colors}
              />
            </View>

            {d.choice === 'opt_out' && (
              <TouchableOpacity
                style={[styles.formLink, { borderColor: colors.primary }]}
                onPress={() => handleDecline(proc.id)}
                disabled={docBusy === proc.id}
              >
                {docBusy === proc.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.formLinkText, { color: colors.primary }]}>
                    {hasStateForm
                      ? "Open your state's official declination form →"
                      : 'Prepare my informed-choice document →'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {docInfo ? (
        <Text style={[styles.docInfo, { color: colors.textSecondary }]}>{docInfo}</Text>
      ) : null}
    </View>
  );
}

function ChoiceButton({
  label,
  active,
  tone,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  tone: 'accept' | 'decline';
  onPress: () => void;
  colors: ThemeColors;
}) {
  const activeColor = tone === 'accept' ? colors.success : colors.secondary;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.choiceBtn,
        {
          borderColor: active ? activeColor : colors.border,
          backgroundColor: active ? activeColor : 'transparent',
        },
      ]}
    >
      <Text style={[styles.choiceBtnText, { color: active ? '#FFFFFF' : colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  stateBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  stateBannerText: {
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  choiceBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formLink: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  formLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  docInfo: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 10,
  },
  vkRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  vkChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  vkChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});