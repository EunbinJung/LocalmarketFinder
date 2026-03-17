import { useMemo } from 'react';
import { Image, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Bell, BellOff, Clock } from 'lucide-react-native';
import { Market, useSearch } from '../../../context/SearchContext';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';
import { getPhotoUrl } from '../../../utils/photoUtils';

interface Props {
  market: Market;
  nextAlertIcon: 'off' | 'pending' | 'scheduled';
  nextAlertText: string;
  weeklyOpenDaysText: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  settings: SavedMarketNotificationSettings;
  onChange: (partial: Partial<SavedMarketNotificationSettings>) => void;
}

const ALERT_ICONS = {
  off: BellOff,
  pending: Clock,
  scheduled: Bell,
} as const;

function MarketCardHeader({
  market,
  nextAlertIcon,
  nextAlertText,
  weeklyOpenDaysText,
  expanded,
  onToggleExpanded,
  settings,
  onChange,
}: Props) {
  const { setSelectedMarket } = useSearch();

  const photoUrl = useMemo(
    () => getPhotoUrl(market?.photo_reference, market?.photo_storage_url, 240),
    [market?.photo_reference, market?.photo_storage_url],
  );

  return (
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
          <View className="flex-row items-center gap-1.5 mt-1">
            {(() => { const Icon = ALERT_ICONS[nextAlertIcon]; return <Icon size={13} color="#9CA3AF" />; })()}
            <Text className="text-sm text-gray-600 flex-1" numberOfLines={1} ellipsizeMode="tail">
              {nextAlertText}
            </Text>
          </View>
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
            onValueChange={(value) => onChange({ enabled: value, openDays: settings.openDays })}
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
  );
}

export default MarketCardHeader;
