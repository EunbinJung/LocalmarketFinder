import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react-native';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, getDoc } from 'firebase/firestore';
import { db, ensureAuthenticated } from '../../services/firebase';
import { Market, useSearch } from '../../context/SearchContext';
import {
  getSavedMarketNotificationSettings,
  SavedMarketNotificationSettings,
  upsertSavedMarketNotificationSettings,
} from '../../services/savedMarketNotificationService';
import { DEFAULT_ALERT_TIME } from '../../utils/alertTimeUtils';
import { buildDefaultSettings, clampLeadDays } from '../../utils/savedMarketsNotificationUtils';
import type { SnackbarType } from '../common/TopSnackbar';
import EmptyFeed from './savedMarketsFeed/EmptyFeed';
import SavedMarketNotificationRow from './savedMarketsFeed/SavedMarketNotificationRow';
import UpcomingAlertsSection from './savedMarketsFeed/UpcomingAlertsSection';

type FeedItem = { market: Market; settings: SavedMarketNotificationSettings };

function SavedMarketsFeed({
  onShowSnackbar,
}: {
  onShowSnackbar?: (message: string, type?: SnackbarType) => void;
}) {
  const { savedMarketIds } = useSearch();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [expandedPlaceIds, setExpandedPlaceIds] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // Single shared time picker — one instance for the whole feed
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const pickerCallbackRef = useRef<((t: string) => void) | null>(null);
  const translateY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openTimePicker = useCallback((currentTime: string, onConfirm: (t: string) => void) => {
    const [h, m] = currentTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    setPickerDate(d);
    pickerCallbackRef.current = onConfirm;
    setPickerVisible(true);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const closeTimePicker = useCallback((confirm: boolean) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 300, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setPickerVisible(false));
    if (confirm && pickerCallbackRef.current) {
      const t = `${String(pickerDate.getHours()).padStart(2, '0')}:${String(pickerDate.getMinutes()).padStart(2, '0')}`;
      pickerCallbackRef.current(t);
      pickerCallbackRef.current = null;
    }
  }, [translateY, backdropOpacity, pickerDate]);

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

        await ensureAuthenticated();
        const results: FeedItem[] = [];

        for (const placeId of savedMarketIds) {
          try {
            const marketSnap = await getDoc(doc(db, 'markets', placeId));
            if (!marketSnap.exists()) continue;

            const market = { place_id: marketSnap.id, ...(marketSnap.data() as any) } as Market;
            const stored = await getSavedMarketNotificationSettings(placeId);
            const defaults = buildDefaultSettings(market, DEFAULT_ALERT_TIME);

            const merged: SavedMarketNotificationSettings = {
              ...defaults,
              ...stored,
              openDays: stored?.openDays?.length ? stored.openDays : defaults.openDays,
              leadDays: clampLeadDays(stored?.leadDays),
              timeOfDay: stored?.timeOfDay || defaults.timeOfDay,
            };

            results.push({ market, settings: merged });
          } catch {
            // skip failed market
          }
        }

        if (!cancelled) setItems(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [savedMarketIds]);

  const updateSettings = async (
    placeId: string,
    partial: Partial<SavedMarketNotificationSettings>,
  ) => {
    setItems(prev =>
      prev.map(item =>
        item.market.place_id === placeId
          ? { ...item, settings: { ...item.settings, ...partial } }
          : item,
      ),
    );

    const ok = await upsertSavedMarketNotificationSettings(placeId, partial);
    if (!ok) {
      try {
        const stored = await getSavedMarketNotificationSettings(placeId);
        setItems(prev =>
          prev.map(item =>
            item.market.place_id === placeId && stored
              ? { ...item, settings: { ...item.settings, ...stored, leadDays: clampLeadDays(stored.leadDays) } }
              : item,
          ),
        );
      } catch { /* ignore */ }
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
    return <EmptyFeed />;
  }

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
        <UpcomingAlertsSection items={items} />

        <View className="mx-5 mb-2">
          <View className="flex-row items-center gap-2">
            <Heart size={18} color="#1F2937" />
            <Text className="text-lg font-bold text-gray-900">Saved markets</Text>
          </View>
          <Text className="text-sm text-gray-600 mt-1">Tap a card to configure alerts</Text>
        </View>

        <View className="mt-3">
          {items.map(({ market, settings }) => (
            <SavedMarketNotificationRow
              key={market.place_id}
              market={market}
              settings={settings}
              expanded={expandedPlaceIds.includes(market.place_id)}
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
              onOpenTimePicker={openTimePicker}
            />
          ))}
        </View>
      </ScrollView>

      {/* Singleton time picker — rendered once at feed level */}
      <Modal visible={pickerVisible} transparent animationType="none">
        <Animated.View style={[pickerStyles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={pickerStyles.backdropPress} onPress={() => closeTimePicker(false)} />
        </Animated.View>
        <Animated.View style={[pickerStyles.sheet, pickerStyles.sheetPadding, { transform: [{ translateY }] }]}>
          <View style={pickerStyles.header}>
            <TouchableOpacity onPress={() => closeTimePicker(false)}>
              <Text style={pickerStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={pickerStyles.titleText}>Set Time</Text>
            <TouchableOpacity onPress={() => closeTimePicker(true)}>
              <Text style={pickerStyles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            onChange={(_e, date) => { if (date) setPickerDate(date); }}
            style={pickerStyles.picker}
            textColor="#1F2937"
          />
        </Animated.View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropPress: { flex: 1 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cancelText: { fontSize: 16, color: '#6B7280' },
  titleText: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  doneText: { fontSize: 16, fontWeight: '700', color: '#E69DB8' },
  picker: { backgroundColor: '#fff' },
  sheetPadding: { paddingBottom: Platform.select({ ios: 34, default: 16 }) },
});

export default SavedMarketsFeed;
