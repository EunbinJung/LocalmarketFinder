import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Bell } from 'lucide-react-native';

interface Props {
  onSave: () => void;
  onClose: () => void;
  onAlertPress?: () => void;
  isSaved: boolean;
  loading: boolean;
}

function MarketDetailHeader({
  onSave,
  onClose,
  onAlertPress,
  isSaved,
  loading,
}: Props) {
  const buttonStyle = loading
    ? { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }
    : isSaved
      ? { backgroundColor: '#E69DB8', borderColor: '#E69DB8' }
      : { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB' };

  const textColor = loading ? '#9CA3AF' : isSaved ? '#FFFFFF' : '#6B7280';

  return (
    <View
      className="flex-row justify-between items-center px-5 py-4 bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-2xl font-bold text-gray-800">Market Details</Text>
      <View className="flex-row gap-3 items-center">
        {isSaved && !loading && (
          <TouchableOpacity
            onPress={onAlertPress}
            activeOpacity={0.85}
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#E69DB8',
            }}
          >
            <Bell size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onSave}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            minWidth: 67,
            height: 36,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            ...buttonStyle,
          }}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={textColor}
              style={{ transform: [{ scale: 0.6 }] }}
            />
          ) : (
            <Text style={{ color: textColor, fontWeight: '600', fontSize: 14 }}>
              {isSaved ? 'Saved ✓' : 'Save'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.85}
          style={{
            minWidth: 67,
            height: 36,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F3F4F6',
            borderColor: '#E5E7EB',
          }}
        >
          <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default MarketDetailHeader;
