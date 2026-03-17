import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';
import {
  DEFAULT_ALERT_TIME,
  formatTime12h,
  parseTimeToMinutes,
  sanitizeTimeDraft,
} from '../../../utils/alertTimeUtils';
import type { SnackbarType } from '../../common/TopSnackbar';

const PRESET_TIMES = ['06:00', '07:00', '08:00', '09:00', '18:00', '20:00', '21:00'] as const;

interface Props {
  effectiveTimeOfDay: string;
  expanded: boolean;
  enabled: boolean;
  onChange: (partial: Partial<SavedMarketNotificationSettings>) => void;
  onShowSnackbar?: (message: string, type?: SnackbarType) => void;
  onRequestScrollToBottom?: () => void;
}

function TimeInput({
  effectiveTimeOfDay,
  expanded,
  enabled,
  onChange,
  onShowSnackbar,
  onRequestScrollToBottom,
}: Props) {
  const [timeDraft, setTimeDraft] = useState(effectiveTimeOfDay);
  const lastInvalidSnackAtRef = useRef(0);

  useEffect(() => {
    setTimeDraft(effectiveTimeOfDay);
  }, [effectiveTimeOfDay, expanded]);

  return (
    <>
      <Text className="text-sm font-semibold text-gray-800 mb-2">Notify time (HH:mm)</Text>
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
            editable={enabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={5}
            onFocus={() => onRequestScrollToBottom?.()}
            onBlur={() => {
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
          <Text className="text-gray-700 font-semibold">{formatTime12h(timeDraft)}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        className="mb-5"
      >
        {PRESET_TIMES.map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => {
              setTimeDraft(t);
              onChange({ timeOfDay: t });
              onShowSnackbar?.(`Time updated: ${t}`, 'success');
            }}
            className={`px-3 py-2 rounded-2xl ${effectiveTimeOfDay === t ? 'bg-primary' : 'bg-tertiary'}`}
            activeOpacity={0.85}
            disabled={!enabled}
            style={{ opacity: enabled ? 1 : 0.45 }}
          >
            <Text className={`${effectiveTimeOfDay === t ? 'text-white' : 'text-gray-800'} font-semibold`}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

export default TimeInput;
