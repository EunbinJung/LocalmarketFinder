import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Clock } from 'lucide-react-native';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';
import type { SnackbarType } from '../../common/TopSnackbar';

const PRESET_TIMES = ['06:00', '07:00', '08:00', '09:00', '18:00', '20:00', '21:00'] as const;

interface Props {
  effectiveTimeOfDay: string;
  expanded: boolean;
  enabled: boolean;
  onChange: (partial: Partial<SavedMarketNotificationSettings>) => void;
  onShowSnackbar?: (message: string, type?: SnackbarType) => void;
  onRequestScrollToBottom?: () => void;
  onOpenTimePicker: (currentTime: string, onConfirm: (t: string) => void) => void;
}

function TimeInput({ effectiveTimeOfDay, enabled, onChange, onShowSnackbar, onOpenTimePicker }: Props) {
  const isPreset = (PRESET_TIMES as readonly string[]).includes(effectiveTimeOfDay);

  const handlePresetSelect = (t: string) => {
    onChange({ timeOfDay: t });
    onShowSnackbar?.(`Time updated: ${t}`, 'success');
  };

  const handleOpenPicker = () => {
    onOpenTimePicker(effectiveTimeOfDay, (t) => {
      onChange({ timeOfDay: t });
      onShowSnackbar?.(`Time updated: ${t}`, 'success');
    });
  };

  return (
    <>
      <Text className="text-sm font-semibold text-gray-800 mb-2">Notify time</Text>

      {/* Custom button */}
      <TouchableOpacity
        onPress={handleOpenPicker}
        disabled={!enabled}
        activeOpacity={0.8}
        style={[styles.customBtn, !isPreset && styles.customBtnActive, !enabled && styles.disabled]}
      >
        <Clock size={14} color={!isPreset ? '#E69DB8' : '#9CA3AF'} />
        <Text style={[styles.customLabel, !isPreset && styles.customLabelActive]}>Custom</Text>
        {!isPreset && (
          <View style={styles.customTimeBadge}>
            <Text style={styles.customTimeText}>{effectiveTimeOfDay}</Text>
          </View>
        )}
        <ChevronRight size={14} color={!isPreset ? '#E69DB8' : '#9CA3AF'} style={styles.chevron} />
      </TouchableOpacity>

      {/* Preset chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        className="mb-5"
      >
        {PRESET_TIMES.map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => handlePresetSelect(t)}
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

const styles = StyleSheet.create({
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  customBtnActive: { borderColor: '#E69DB8', backgroundColor: '#FDF2F8' },
  disabled: { opacity: 0.45 },
  customLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', flex: 1 },
  customLabelActive: { color: '#E69DB8' },
  customTimeBadge: { backgroundColor: '#E69DB8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  customTimeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  chevron: { marginLeft: 2 },
  chipRow: { gap: 8, paddingRight: 16 },
});

export default TimeInput;
