import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react-native';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
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
            />
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default SavedMarketsFeed;
