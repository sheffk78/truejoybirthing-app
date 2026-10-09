// kick-counter.tsx — approved Kick Counter (mockup v2, Jeff-approved 10/05
// msg 1556788160493781056; design law: docs/design-refresh/kick-counter-mockup/
// index.html). Cream screen, 214px tap pad with S11 halo rings strictly in the
// BACKGROUND (mockup v2 z-order: halo 0 < rim 1 < pad 2 — never above content),
// rose progress rim filling toward 10, serif count + 'OF 10 KICKS' label,
// hairline rule, Cormorant session clock, 'SESSION · H:MM AM' slab (NO
// ripple/tapsays decoration — removed per Jeff), hand-drawn kick dots,
// today strip, recent sessions card, lavender Pause + outline End & Save,
// sage care chip. No photo band, no violet #7C3AED, no blue, no emoji.
//
// Colors: mockup hues read from the corpus (src/constants/corpus.ts) — the
// week-spine token drop already carries ringTrack #F0E6E2 / ringArc #C48CA8 /
// ringArcDashed #D8A0C4 / wkChipBorder #E5DCD5. Mockup-only hexes map to their
// approved token by ROLE: .seg bg #F1E9F5 -> lavenderBg (chip-bg role), .seg
// inactive text #74716A -> gray, .hrow divider #F4EDF3 -> hairline. Stat
// numerals + clock use lavenderText (split token: identical to lavender in
// light, the text-role value in dark per the 2026-09-23 dark corpus law).
//
// Storage: device-local via src/utils/kickStorage.ts (AsyncStorage
// 'tjb_kick_sessions_v1'). No backend, no sync. expo-haptics is a declared
// dependency — light impact per kick, success notification on save.

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import TIcon from '../../src/components/TIcon';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F, SIZES } from '../../src/constants/corpus';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import {
  loadSessions,
  saveSession,
  totalsFrom,
  type KickSession,
  type TodaysTotals,
} from '../../src/utils/kickStorage';

// ---- Mockup pad geometry (.padwrap 252sq / .pad 214sq / rim r=122) ----
const PAD_PX = 214;
const PAD_WRAP_PX = 252;
const RIM_R = 122;
const RIM_CIRC = 2 * Math.PI * RIM_R; // ~767 (mockup dasharray denominator)
const KICK_TARGET = 10;

type Mode = 'count_to_10' | 'free';

// Mockup .pad-rim transform: rotate(-103 126 126) — approved hand-drawn
// overhang past top center, kept verbatim.
const RIM_ROTATE = 'rotate(-103 126 126)';

function trimesterTitleCase(week: number): string {
  // Approved mockup kicker reads 'Third Trimester' (title case); corpus
  // trimesterOf() returns sentence case, so the case is applied here.
  if (week <= 13) return 'First Trimester';
  if (week <= 27) return 'Second Trimester';
  return 'Third Trimester';
}

// mm:ss live session clock (.clock, Cormorant)
function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 'Session · 9:34 AM' (.slab, uppercase via style)
function formatSessionSlab(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// 'Today · 8:05 AM' / 'Yesterday · 8:32 PM' / 'Oct 3 · 9:12 AM' (.when)
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86400000);
  const dayLabel =
    diffDays === 0
      ? 'Today'
      : diffDays === 1
        ? 'Yesterday'
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${dayLabel} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

// strip 'Last Session' cell value
function formatClockTimeOrDash(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// .dur cell: serif numeral + unit — seconds under a minute ('45 s'), else minutes
function durParts(durationSec: number): { value: string; unit: string } | null {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null;
  if (durationSec < 60) return { value: String(Math.round(durationSec)), unit: 's' };
  return { value: String(Math.round(durationSec / 60)), unit: 'min' };
}

export default function KickCounterScreen() {
  const router = useRouter();
  const colors = useColors(); // theme-flip re-render; palette reads live corpus C
  const styles = getStyles(colors);

  const [mode, setMode] = useState<Mode>('count_to_10');
  const [kicks, setKicks] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const setStart = (d: Date | null) => {
    startedAtRef.current = d;
    setStartedAt(d);
  };
  // 10-kick auto-save confirmation flash ('Saved · H:MM AM' in the slab)
  const [savedFlash, setSavedFlash] = useState(false);
  const [recent, setRecent] = useState<KickSession[]>([]);
  const [todayTotals, setTodayTotals] = useState<TodaysTotals>({
    sessionCount: 0,
    kickCount: 0,
    lastSessionISO: null,
  });
  const [kickWeek, setKickWeek] = useState<number | null>(null);

  const refreshFromStorage = useCallback(async () => {
    const sessions = await loadSessions();
    // Chronological sort first (storage order could deviate), then the last 3
    // newest first — matches the mockup .hcard row order.
    const chrono = [...sessions].sort(
      (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime(),
    );
    setRecent(chrono.slice(-3).reverse());
    setTodayTotals(totalsFrom(chrono));
  }, []);

  // Load history + timeline week. Timeline null or fetch failure -> the kicker
  // falls back to 'Today' (postpartum moms have no pregnancy timeline).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshFromStorage();
      try {
        const data = await apiRequest<{ current_week?: number | string }>(API_ENDPOINTS.TIMELINE);
        const wk = Number(data?.current_week);
        if (!cancelled && Number.isFinite(wk) && wk >= 1) setKickWeek(wk);
      } catch {
        if (!cancelled) setKickWeek(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFromStorage]);

  // Live mm:ss clock — ticks only while a session is active and unpaused.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active && !paused) {
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [active, paused]);

  // Count-to-10 auto-save: the 10th kick writes the session, confirms
  // (slab flash + success haptic), then restarts the counter for the next
  // round. Taps beyond 10 are ignored in this mode (pad disables at 10).
  useEffect(() => {
    if (mode !== 'count_to_10' || !active || paused) return;
    if (kicks < KICK_TARGET) return;
    const at = startedAtRef.current;
    const durSec = elapsedSec;
    (async () => {
      if (at) {
        await saveSession({ dateISO: at.toISOString(), kicks, durationSec: durSec, mode });
        await refreshFromStorage();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      setKicks(0);
      setElapsedSec(0);
      setStart(new Date()); // restart affordance: the next round starts now
    })().catch(() => {});
    // Runs on the 10th-kick render; elapsed/save are read at fire time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kicks, mode, active, paused]);

  const startSession = useCallback(() => {
    setActive(true);
    setPaused(false);
    setKicks(0);
    setElapsedSec(0);
    setStart(new Date());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const padTap = useCallback(() => {
    if (!active) {
      // Restart affordance: tapping an ended pad begins a fresh session
      // (the start tap itself is not counted as a movement).
      startSession();
      return;
    }
    if (paused) return;
    if (mode === 'count_to_10' && kicks >= KICK_TARGET) return; // beyond 10: ignored
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setKicks((k) => k + 1);
  }, [active, paused, mode, kicks, startSession]);

  const pauseResume = useCallback(() => {
    if (!active) return;
    setPaused((p) => !p);
  }, [active]);

  const endAndSave = useCallback(async () => {
    const at = startedAtRef.current;
    if (active && at) {
      // End & Save always writes a started session (free mode included).
      await saveSession({
        dateISO: at.toISOString(),
        kicks,
        durationSec: elapsedSec,
        mode,
      });
      await refreshFromStorage();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setActive(false);
    setPaused(false);
    setKicks(0);
    setElapsedSec(0);
    setStart(null);
  }, [active, kicks, elapsedSec, mode, refreshFromStorage]);

  // Rim arc fraction — count-to-10: kicks/10; free: full/none while active.
  const rimPct = useMemo(() => {
    if (mode === 'free') return active ? 1 : 0;
    return Math.min(kicks / KICK_TARGET, 1);
  }, [mode, active, kicks]);
  const rimDash = `${(RIM_CIRC * rimPct).toFixed(1)} ${RIM_CIRC.toFixed(1)}`;

  const kicker = kickWeek ? `Week ${kickWeek} · ${trimesterTitleCase(kickWeek)}` : 'Today';
  const padDisabled = !active || paused || (mode === 'count_to_10' && kicks >= KICK_TARGET);
  const slabText = (() => {
    if (savedFlash) return `Saved · ${formatSessionSlab(new Date())}`;
    if (!active) return 'Tap the pad to begin';
    if (paused) return 'Paused';
    return `Session · ${formatSessionSlab(startedAt ?? new Date())}`;
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header — .kc-head: back chip + rose kicker + Cormorant title */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="kick-back-btn"
          >
            {/* .back chevron — the mockup's hand-drawn path, kept verbatim */}
            <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
              <Path
                d="M12.4 3.8 L5.8 10 L12.4 16.2"
                stroke={C.lavenderText}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <View style={styles.headerTextGroup}>
            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.title}>
              Kick <Text style={styles.titleAccent}>Counter</Text>
            </Text>
          </View>
        </View>

        {/* .seg — Count to 10 kicks / Free session */}
        <View style={styles.seg}>
          {([
            { value: 'count_to_10' as Mode, label: 'Count to 10 kicks' },
            { value: 'free' as Mode, label: 'Free session' },
          ]).map((opt) => {
            const on = opt.value === mode;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setMode(opt.value);
                  setSavedFlash(false);
                }}
                style={[styles.segBtn, on && styles.segBtnOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                testID={`kick-mode-${opt.value}`}
              >
                <Text style={[styles.segText, on && styles.segTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tap pad — .heroz/.padwrap: halo(0) < rim(1) < pad(2); the whole
            214px circle is the tap target; press = ~0.85 + subtle scale */}
        <View style={styles.heroZone}>
          <View style={styles.padWrap}>
            {/* .padwrap .halo — S11 background rings, scoped BEHIND the pad */}
            <Svg
              width={PAD_WRAP_PX}
              height={PAD_WRAP_PX}
              viewBox="0 0 252 252"
              fill="none"
              style={styles.haloSvg}
            >
              <Circle cx={126} cy={126} r={134} stroke={C.halo} strokeWidth={1.2} />
              <Circle cx={126} cy={126} r={142} stroke={C.halo} strokeWidth={1} />
            </Svg>
            {/* .pad-rim — track + rose arc (pct/10 round-cap dasharray, -103
                rotation) + dashed halo ring; BEHIND the pad circle */}
            <Svg
              width={PAD_WRAP_PX}
              height={PAD_WRAP_PX}
              viewBox="0 0 252 252"
              fill="none"
              style={styles.rimSvg}
            >
              <Circle cx={126} cy={126} r={RIM_R} stroke={C.ringTrack} strokeWidth={5} />
              <Circle
                cx={126}
                cy={126}
                r={RIM_R}
                stroke={C.ringArc}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={rimDash}
                transform={RIM_ROTATE}
              />
              <Circle
                cx={126}
                cy={126}
                r={128}
                stroke={C.ringArcDashed}
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeDasharray="10 8"
                opacity={0.45}
              />
            </Svg>
            {/* .pad — white 214px circle, the tap target */}
            <Pressable
              onPress={padTap}
              disabled={padDisabled}
              accessibilityRole="button"
              accessibilityLabel="Log one kick"
              accessibilityHint={
                mode === 'count_to_10'
                  ? 'Counts toward the 10-kick session'
                  : 'Counts a kick in the free session'
              }
              testID="kick-pad"
              style={({ pressed }) => [styles.pad, pressed && !padDisabled && styles.padPressed]}
            >
              <Text style={styles.padNum}>{kicks}</Text>
              <Text style={styles.padOf}>
                {mode === 'count_to_10' ? 'of 10 kicks' : 'kicks counted'}
              </Text>
              <View style={styles.padRule} />
              <Text style={styles.padClock}>{formatClock(elapsedSec)}</Text>
              <Text style={styles.padSlab} numberOfLines={1}>
                {slabText}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>Tap the circle each time you feel a movement</Text>
        </View>

        {/* 10-kick dots — mirrors the kick count (cap 10 shown, both modes) */}
        <View style={styles.dotsRow}>
          {Array.from({ length: KICK_TARGET }, (_, i) => {
            const filled = i < kicks;
            return (
              <Svg key={i} width={17} height={17} style={styles.dot}>
                <Circle
                  cx={8.5}
                  cy={8.5}
                  r={7.5}
                  fill={filled ? C.ringArcDashed : C.surface}
                  stroke={filled ? C.roseBorder : C.wkChipBorder}
                  strokeWidth={filled ? 1.6 : 1.5}
                />
              </Svg>
            );
          })}
        </View>

        {/* Today strip — .strip: serif numerals on the S11 strip construction */}
        <View style={styles.strip}>
          <View style={styles.stripCell}>
            <Text style={styles.stripVal}>{todayTotals.sessionCount}</Text>
            <Text style={styles.stripLbl}>Sessions Today</Text>
          </View>
          <View style={styles.stripDiv} />
          <View style={styles.stripCell}>
            <Text style={styles.stripVal}>{todayTotals.kickCount}</Text>
            <Text style={styles.stripLbl}>Kicks Today</Text>
          </View>
          <View style={styles.stripDiv} />
          <View style={styles.stripCell}>
            <Text style={styles.stripVal}>{formatClockTimeOrDash(todayTotals.lastSessionISO)}</Text>
            <Text style={styles.stripLbl}>Last Session</Text>
          </View>
        </View>

        {/* Recent sessions — .hcard: last 3 stored sessions, newest first */}
        <View style={styles.recentCard}>
          <View style={styles.recentHead}>
            <TIcon name="k_timeline" size={15} color={C.rose} />
            <Text style={styles.recentKicker}>Recent Sessions</Text>
          </View>
          {recent.length === 0 ? (
            <Text style={styles.recentEmpty}>No sessions yet — your counts will list here.</Text>
          ) : (
            recent.map((s, idx) => {
              const dur = durParts(s.durationSec);
              return (
                <View
                  key={s.id}
                  // .hrow: divider between rows; first row is divider-free + 6px top margin
                  style={[styles.recentRow, idx === 0 ? styles.recentRowFirst : null]}
                >
                  <Text style={styles.recentWhen} numberOfLines={1}>
                    {formatWhen(s.dateISO)}
                  </Text>
                  <Text style={styles.recentWhat}>
                    <Text style={styles.recentWhatEm}>{s.kicks}</Text>
                    {' kicks'}
                  </Text>
                  <Text style={styles.recentDur}>
                    {dur ? (
                      <>
                        <Text style={styles.recentDurEm}>{dur.value}</Text>
                        {` ${dur.unit}`}
                      </>
                    ) : (
                      '0 min'
                    )}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Controls — .btnrow: lavender solid (flex 1.6) + outline ghost */}
        <View style={styles.btnRow}>
          {active ? (
            <>
              <Button
                title={paused ? 'Resume Session' : 'Pause Session'}
                onPress={pauseResume}
                tone="deep"
                testID="kick-pause-btn"
                style={styles.primaryBtn}
                textStyle={styles.primaryBtnText}
              />
              <Button
                title="End & Save"
                onPress={endAndSave}
                variant="outline"
                testID="kick-end-btn"
                style={styles.outlineBtn}
                textStyle={styles.outlineBtnText}
              />
            </>
          ) : (
            <Button
              title="Start Session"
              onPress={startSession}
              tone="deep"
              testID="kick-start-btn"
              style={styles.primaryBtn}
              textStyle={styles.primaryBtnText}
            />
          )}
        </View>

        {/* .care — calm sage guidance; reassuring, never alarming */}
        <View style={styles.careChip}>
          <Text style={styles.careText}>
            Counts help you learn your baby&apos;s patterns — call your provider about changes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Styles — mockup .kc-head/.seg/.pad/.dotsrow/.strip/.hcard/.btnrow/.care ----
const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background, // cream / plum-black canvas
  },
  scroll: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  headerTextGroup: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.rose,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: F.serif,
    color: C.ink,
  },
  titleAccent: {
    color: C.roseSoft,
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: C.lavenderBg, // mockup .seg pill-bg role
    borderRadius: SIZES.radiusFull,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 14,
  },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
  },
  segBtnOn: {
    backgroundColor: C.surface,
    // .seg .on box-shadow -> RN shadow surrogate
    shadowColor: C.lavender,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segText: {
    fontSize: 11,
    fontFamily: F.uiSemi,
    color: C.gray,
  },
  segTextOn: {
    fontFamily: F.uiBold,
    color: C.lavenderSoft,
  },
  heroZone: {
    alignItems: 'center',
    paddingTop: 6,
  },
  padWrap: {
    width: PAD_WRAP_PX,
    height: PAD_WRAP_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // .padwrap .halo / .pad-rim — absolutely centered, z-order: halo < rim < pad
  haloSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  rimSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  pad: {
    width: PAD_PX,
    height: PAD_PX,
    borderRadius: PAD_PX / 2,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.lavender,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    elevation: 8,
  },
  padPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  padNum: {
    fontSize: 74,
    lineHeight: 78,
    fontFamily: F.serif,
    color: C.ink,
  },
  padOf: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.rose,
    marginTop: 12,
  },
  padRule: {
    width: 64,
    height: 1,
    backgroundColor: C.ringTrack,
    marginTop: 10,
    marginBottom: 8,
  },
  padClock: {
    fontSize: 23,
    lineHeight: 23,
    fontFamily: F.serif,
    color: C.lavenderText,
    letterSpacing: 1,
  },
  padSlab: {
    fontSize: 9.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.grayLight,
    marginTop: 6,
  },
  helper: {
    fontSize: 11.5,
    fontFamily: F.ui,
    color: C.gray,
    marginTop: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    marginTop: 10,
  },
  dot: {},
  strip: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.hairline,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
  },
  stripVal: {
    fontSize: 19,
    lineHeight: 21,
    fontFamily: F.serif,
    color: C.lavenderText,
  },
  stripLbl: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.grayLight,
    marginTop: 2,
  },
  stripDiv: {
    width: 1,
    backgroundColor: C.hairline,
    marginVertical: 2,
  },
  recentCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingBottom: 8,
    marginHorizontal: 20,
    marginTop: 10,
  },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  recentKicker: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontFamily: F.uiBold,
    color: C.rose,
  },
  recentEmpty: {
    fontSize: 11.5,
    fontFamily: F.ui,
    color: C.gray,
    marginTop: 10,
    marginBottom: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderColor: C.hairline, // mockup .hrow divider #F4EDF3 -> hairline role
  },
  recentRowFirst: {
    borderTopWidth: 0,
    marginTop: 6,
  },
  recentWhen: {
    fontSize: 11,
    fontFamily: F.uiSemi,
    color: C.grayLight,
    flex: 1,
  },
  recentWhat: {
    fontSize: 12.5,
    fontFamily: F.uiSemi,
    color: C.ink,
  },
  recentWhatEm: {
    fontSize: 15,
    fontFamily: F.serif,
  },
  recentDur: {
    fontSize: 11,
    fontFamily: F.ui,
    color: C.gray,
    marginLeft: 'auto',
    paddingLeft: 10,
  },
  recentDurEm: {
    fontSize: 13.5,
    fontFamily: F.serif,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 9,
    marginHorizontal: 20,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1.6,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontFamily: F.uiBold,
    color: C.white,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  outlineBtnText: {
    fontSize: 12.5,
    fontFamily: F.uiBold,
    color: C.lavenderText,
  },
  careChip: {
    alignSelf: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.sageBg,
    backgroundColor: C.cream,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  careText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontFamily: F.uiSemi,
    color: C.sage,
    textAlign: 'center',
  },
}));