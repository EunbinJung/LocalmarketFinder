import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, ensureAuthenticated } from '../../services/firebase';
import { Market, useSearch } from '../../context/SearchContext';
import {
  getSavedMarketNotificationSettings,
  SavedMarketNotificationSettings,
  upsertSavedMarketNotificationSettings,
} from '../../services/savedMarketNotificationService';
import { getPhotoUrl } from '../../utils/photoUtils';
import { getWeeklySchedule } from '../../utils/weeklySchedule';
import type { SnackbarType } from '../common/TopSnackbar';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_ALERT_TIME = '20:00';

function getMarketOpenDays(market: Market): number[] {
  const periods = market.opening_hours?.periods;
  if (!Array.isArray(periods) || periods.length === 0) return [];
  const set = new Set<number>();
  for (const p of periods) {
    const day = p?.open?.day;
    if (typeof day === 'number' && day >= 0 && day <= 6) set.add(day);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function clampLeadDays(value: unknown): SavedMarketNotificationSettings['leadDays'] {
  // UX: allow 0~7 days before (same day included)
  if (
    value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6 ||
    value === 7
  ) {
    return value;
  }
  return 1;
}

function buildDefaultSettings(
  market: Market,
  defaultTimeOfDay: string,
): SavedMarketNotificationSettings {
  return {
    enabled: false,
    leadDays: 1,
    openDays: getMarketOpenDays(market),
    timeOfDay: defaultTimeOfDay,
  };
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const [hh, mm] = timeStr.split(':').map(v => parseInt(v, 10));
  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    return null;
  }
  return hh * 60 + mm;
}

function formatTime12h(timeStr: string): string {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr;
  const hh24 = Math.floor(mins / 60);
  const mm = mins % 60;
  const period = hh24 >= 12 ? 'PM' : 'AM';
  const hh12 = hh24 % 12 || 12;
  return `${hh12}:${mm.toString().padStart(2, '0')} ${period}`;
}

function sanitizeTimeDraft(raw: string): { value: string; hadInvalidChars: boolean } {
  // Allow only digits (we will format to HH:mm) and ':' from previous formatting.
  const hadInvalidChars = /[^0-9:]/.test(raw);
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return { value: digits, hadInvalidChars };
  return { value: `${digits.slice(0, 2)}:${digits.slice(2)}`, hadInvalidChars };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function setTimeOnDate(date: Date, timeStr: string): Date {
  const mins = parseTimeToMinutes(timeStr) ?? 0;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function formatRelativeDay(date: Date, now: Date): string {
  const d0 = startOfDay(now).getTime();
  const d1 = startOfDay(date).getTime();
  const diffDays = Math.round((d1 - d0) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return DAY_SHORT[date.getDay()];
}

function computeNextAlert(
  market: Market,
  settings: SavedMarketNotificationSettings,
  defaultTimeOfDay: string,
  now: Date,
): { notifyAt: Date | null; openOn: Date | null } {
  if (!settings.enabled) return { notifyAt: null, openOn: null };
  if (!Array.isArray(settings.openDays) || settings.openDays.length === 0) {
    return { notifyAt: null, openOn: null };
  }

  const timeStr = settings.timeOfDay || defaultTimeOfDay;
  // Search up to the next 21 days to find the next notification moment
  for (let delta = 0; delta <= 21; delta++) {
    const openOn = addDays(startOfDay(now), delta);
    if (!settings.openDays.includes(openOn.getDay())) continue;

    const notifyBase = addDays(openOn, -settings.leadDays);
    const notifyAt = setTimeOnDate(notifyBase, timeStr);

    if (notifyAt.getTime() > now.getTime()) {
      return { notifyAt, openOn };
    }
  }

  return { notifyAt: null, openOn: null };
}

function SavedMarketNotificationRow({
  market,
  settings,
  expanded,
  onToggleExpanded,
  onChange,
  onShowSnackbar,
  onRequestScrollToBottom,
}: {
  market: Market;
  settings: SavedMarketNotificationSettings;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (partial: Partial<SavedMarketNotificationSettings>) => void;
  onShowSnackbar?: (message: string, type?: SnackbarType) => void;
  onRequestScrollToBottom?: () => void;
}) {
  const { setSelectedMarket } = useSearch();

  const openDayOptions = useMemo(() => getMarketOpenDays(market), [market]);
  const effectiveTimeOfDay = settings.timeOfDay || DEFAULT_ALERT_TIME;

  const [timeDraft, setTimeDraft] = useState(effectiveTimeOfDay);
  const lastInvalidSnackAtRef = useRef(0);
  useEffect(() => {
    setTimeDraft(effectiveTimeOfDay);
  }, [effectiveTimeOfDay, expanded]);

  const weeklyOpenDaysText = useMemo(() => {
    const weekly = getWeeklySchedule(market.opening_hours?.periods).filter(d => d.isOpen);
    if (weekly.length === 0) return 'Opening hours not available';
    const compact = weekly
      .map(d => {
        const dayIndex = DAY_NAMES.indexOf(d.day);
        const dayShort = dayIndex >= 0 ? DAY_SHORT[dayIndex] : d.day.slice(0, 3);
        return `${dayShort} ${d.openTime}-${d.closeTime}`;
      })
      .filter(Boolean);
    return compact.join(' · ');
  }, [market]);

  const nextAlert = useMemo(() => {
    return computeNextAlert(market, settings, DEFAULT_ALERT_TIME, new Date());
  }, [market, settings]);

  const nextAlertText = useMemo(() => {
    if (!settings.enabled) return '🔕 Off';
    if (!nextAlert.notifyAt) return '⏳ Not scheduled';
    return `🔔 ${formatRelativeDay(nextAlert.notifyAt, new Date())} · ${formatTime12h(effectiveTimeOfDay)}`;
  }, [settings.enabled, nextAlert.notifyAt, effectiveTimeOfDay]);

  const photoUrl = useMemo(() => {
    return getPhotoUrl(market?.photo_reference, market?.photo_storage_url, 240);
  }, [market?.photo_reference, market?.photo_storage_url]);

  return (
    <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 overflow-hidden">
      {/* Collapsed header */}
      <View className="px-5 pt-5 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onToggleExpanded}
            className="flex-1 pr-4"
          >
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {market.name}
            </Text>
            <Text className="text-sm text-gray-600 mt-1" numberOfLines={1} ellipsizeMode="tail">
              {nextAlertText}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setSelectedMarket(market)}
              activeOpacity={0.85}
              className="rounded-2xl overflow-hidden"
            >
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  className="w-11 h-11 rounded-2xl bg-gray-100"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-11 h-11 rounded-2xl bg-gray-100" />
              )}
            </TouchableOpacity>

            <Switch
              value={settings.enabled}
              onValueChange={(value) => onChange({ enabled: value })}
              trackColor={{ false: '#E5E7EB', true: '#E69DB8' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>

        {!expanded && (
          <Text className="text-xs text-gray-500 mt-3" numberOfLines={2} ellipsizeMode="tail">
            {weeklyOpenDaysText}
          </Text>
        )}
      </View>

      {/* Expanded content */}
      {expanded && (
        <>
          <View className="h-px bg-gray-100" />

          <View className="px-5 pt-4 pb-5">
            <Text className="text-sm font-semibold text-gray-800 mb-2">
              Days before (0–7)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 16 }}
              className="mb-4"
            >
              {([0, 1, 2, 3, 4, 5, 6, 7] as const).map(days => (
                <TouchableOpacity
                  key={days}
                  onPress={() => onChange({ leadDays: days })}
                  className={`px-3 py-2 rounded-2xl ${
                    settings.leadDays === days ? 'bg-primary' : 'bg-tertiary'
                  }`}
                  activeOpacity={0.85}
                  disabled={!settings.enabled}
                  style={{ opacity: settings.enabled ? 1 : 0.45 }}
                >
                  <Text className={`${settings.leadDays === days ? 'text-white' : 'text-gray-800'} font-semibold`}>
                    {days}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-sm font-semibold text-gray-800 mb-2">
              Notify time (HH:mm)
            </Text>
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1 bg-tertiary rounded-2xl px-4 py-3">
                <TextInput
                  value={timeDraft}
                  onChangeText={(raw) => {
                    const next = sanitizeTimeDraft(raw);
                    setTimeDraft(next.value);
                    if (next.hadInvalidChars) {
                      const now = Date.now();
                      if (now - lastInvalidSnackAtRef.current > 1200) {
                        lastInvalidSnackAtRef.current = now;
                        onShowSnackbar?.('Numbers only', 'error');
                      }
                    }
                  }}
                  placeholder={DEFAULT_ALERT_TIME}
                  placeholderTextColor="#9CA3AF"
                  className="text-gray-800 font-semibold"
                  editable={settings.enabled}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={5}
                  onFocus={() => {
                    onRequestScrollToBottom?.();
                  }}
                  onBlur={() => {
                    // Commit only if valid; otherwise revert
                    if (parseTimeToMinutes(timeDraft) === null) {
                      onShowSnackbar?.('Invalid time (use HHmm)', 'error');
                      setTimeDraft(effectiveTimeOfDay);
                      return;
                    }
                    if (timeDraft !== effectiveTimeOfDay) {
                      onChange({ timeOfDay: timeDraft });
                      onShowSnackbar?.(`Time updated: ${timeDraft}`, 'success');
                    }
                  }}
                />
              </View>

              <View className="bg-tertiary px-3 py-3 rounded-2xl">
                <Text className="text-gray-700 font-semibold">
                  {formatTime12h(timeDraft)}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 16 }}
              className="mb-5"
            >
              {(['06:00', '07:00', '08:00', '09:00', '18:00', '20:00', '21:00'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setTimeDraft(t);
                    onChange({ timeOfDay: t });
                    onShowSnackbar?.(`Time updated: ${t}`, 'success');
                  }}
                  className={`px-3 py-2 rounded-2xl ${
                    effectiveTimeOfDay === t ? 'bg-primary' : 'bg-tertiary'
                  }`}
                  activeOpacity={0.85}
                  disabled={!settings.enabled}
                  style={{ opacity: settings.enabled ? 1 : 0.45 }}
                >
                  <Text className={`${effectiveTimeOfDay === t ? 'text-white' : 'text-gray-800'} font-semibold`}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-sm font-semibold text-gray-800 mb-2">
              Market open days
            </Text>
            {openDayOptions.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {openDayOptions.map(day => {
                  const selected = settings.openDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => {
                        const next = selected
                          ? settings.openDays.filter(d => d !== day)
                          : [...settings.openDays, day].sort((a, b) => a - b);
                        onChange({ openDays: next });
                      }}
                      className={`px-3 py-2 rounded-2xl ${selected ? 'bg-primary' : 'bg-tertiary'}`}
                      activeOpacity={0.85}
                      disabled={!settings.enabled}
                      style={{ opacity: settings.enabled ? 1 : 0.45 }}
                    >
                      <Text className={`${selected ? 'text-white' : 'text-gray-800'} font-semibold`}>
                        {DAY_SHORT[day]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text className="text-sm text-gray-500">
                No opening days available to configure.
              </Text>
            )}

            <Text className="text-xs text-gray-500 mt-4">
              {weeklyOpenDaysText}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function SavedMarketsFeed({
  onShowSnackbar,
}: {
  onShowSnackbar?: (message: string, type?: SnackbarType) => void;
}) {
  const { savedMarketIds } = useSearch();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<
    Array<{ market: Market; settings: SavedMarketNotificationSettings }>
  >([]);
  const [expandedPlaceIds, setExpandedPlaceIds] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        if (!Array.isArray(savedMarketIds) || savedMarketIds.length === 0) {
          setItems([]);
          return;
        }

        // Ensure auth (also guarantees we can read notification prefs under users/{uid})
        await ensureAuthenticated();

        const results: Array<{ market: Market; settings: SavedMarketNotificationSettings }> = [];

        for (const placeId of savedMarketIds) {
          try {
            const marketRef = doc(db, 'markets', placeId);
            const marketSnap = await getDoc(marketRef);
            if (!marketSnap.exists()) continue;

            const market = {
              place_id: marketSnap.id,
              ...(marketSnap.data() as any),
            } as Market;

            const stored = await getSavedMarketNotificationSettings(placeId);
            const defaults = buildDefaultSettings(market, DEFAULT_ALERT_TIME);

            const merged: SavedMarketNotificationSettings = {
              ...defaults,
              ...stored,
              // If no openDays stored yet, default to this market's open days
              openDays: stored?.openDays?.length ? stored.openDays : defaults.openDays,
              leadDays: clampLeadDays(stored?.leadDays),
              // If no time stored yet, default to app default
              timeOfDay: stored?.timeOfDay || defaults.timeOfDay,
            };

            results.push({ market, settings: merged });
          } catch (error) {
            console.error('Error loading saved market for feed:', error);
          }
        }

        if (!cancelled) setItems(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [savedMarketIds]);

  const updateSettings = async (
    placeId: string,
    partial: Partial<SavedMarketNotificationSettings>,
  ) => {
    // Optimistic update
    setItems(prev =>
      prev.map(item =>
        item.market.place_id === placeId
          ? {
              ...item,
              settings: {
                ...item.settings,
                ...partial,
              },
            }
          : item,
      ),
    );

    const ok = await upsertSavedMarketNotificationSettings(placeId, partial);
    if (!ok) {
      // If save failed, re-fetch for this item (keep it simple)
      try {
        const stored = await getSavedMarketNotificationSettings(placeId);
        setItems(prev =>
          prev.map(item =>
            item.market.place_id === placeId && stored
              ? {
                  ...item,
                  settings: {
                    ...item.settings,
                    ...stored,
                    leadDays: clampLeadDays(stored.leadDays),
                  },
                }
              : item,
          ),
        );
      } catch {
        // ignore
      }
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#E69DB8" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="px-5 mt-4">
        <View className="bg-white rounded-3xl p-5 border border-gray-100">
          <Text className="text-gray-800 text-lg font-semibold">
            No saved markets yet
          </Text>
          <Text className="text-gray-600 mt-2">
            Save a market from the Map screen to see it here.
          </Text>
        </View>
      </View>
    );
  }

  const upcoming = (() => {
    const now = new Date();
    const enabled = items
      .filter(i => i.settings.enabled)
      .map(i => {
        const next = computeNextAlert(
          i.market,
          i.settings,
          DEFAULT_ALERT_TIME,
          now,
        );
        return {
          placeId: i.market.place_id,
          marketName: i.market.name,
          notifyAt: next.notifyAt,
          openOn: next.openOn,
          timeOfDay: i.settings.timeOfDay || DEFAULT_ALERT_TIME,
          leadDays: i.settings.leadDays,
          openDaysCount: Array.isArray(i.settings.openDays) ? i.settings.openDays.length : 0,
        };
      });

    // Bug fix: if `notifyAt` can't be computed (e.g. openDays missing),
    // we still want the market to appear so the user sees it's enabled.
    const scheduled = enabled
      .filter(x => x.notifyAt)
      .sort((a, b) => (a.notifyAt!.getTime() - b.notifyAt!.getTime()));
    const unscheduled = enabled.filter(x => !x.notifyAt);

    return [...scheduled, ...unscheduled].slice(0, 3);
  })();
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

      {/* Upcoming alerts */}
      <View className="mx-4 mb-4 rounded-3xl overflow-hidden border border-secondary bg-white">
        <View className="bg-white px-5 pt-5 pb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">✨ Upcoming</Text>
            <View className="bg-tertiary px-3 py-1.5 rounded-full border border-gray-100">
              <Text className="text-gray-700 font-semibold">
                {upcoming.length}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5 pb-5 pt-3 w-full">
          {upcoming.length === 0 ? (
            <View className="bg-tertiary rounded-3xl p-5 border border-gray-100">
              <Text className="text-gray-700 font-semibold">
                No upcoming alerts
              </Text>
              <Text className="text-gray-600 mt-2">
                Turn on alerts for a saved market to see upcoming notifications.
              </Text>
            </View>
          ) : (
            <View className="w-full gap-3">
              {upcoming.map(item => (
                <View
                  key={item.placeId}
                  className="bg-secondary rounded-3xl border border-gray-100 p-5 w-full"
                >
                  <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                    {item.marketName}
                  </Text>
                  {item.notifyAt ? (
                    <>
                      <Text className="text-gray-800 font-semibold mt-3">
                        🔔 {formatRelativeDay(item.notifyAt as Date, new Date())}{' '}
                        {formatTime12h(item.timeOfDay)}
                      </Text>
                      {item.openOn && (
                        <Text className="text-gray-700 mt-2">
                          📍 Opens {formatRelativeDay(item.openOn, new Date())}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Text className="text-gray-800 font-semibold mt-3">
                        ⚠️ Not scheduled yet
                      </Text>
                      <Text className="text-gray-700 mt-2">
                        Check open days / lead days / time.
                      </Text>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Saved markets list */}
      <View className="mx-5 mb-2">
        <Text className="text-lg font-bold text-gray-900">💗 Saved markets</Text>
        <Text className="text-sm text-gray-600 mt-1">
          Tap a card to configure alerts
        </Text>
      </View>

      <View className="mt-3">
        {items.map(({ market, settings }) => {
          const expanded = expandedPlaceIds.includes(market.place_id);
          return (
            <SavedMarketNotificationRow
              key={market.place_id}
              market={market}
              settings={settings}
              expanded={expanded}
              onToggleExpanded={() =>
                setExpandedPlaceIds(prev =>
                  prev.includes(market.place_id)
                    ? prev.filter(id => id !== market.place_id)
                    : [...prev, market.place_id],
                )
              }
              onChange={partial => updateSettings(market.place_id, partial)}
              onShowSnackbar={onShowSnackbar}
              onRequestScrollToBottom={scrollToBottom}
            />
          );
        })}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default SavedMarketsFeed;

