import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onSave: () => void;
  onClose: () => void;
  isSaved: boolean;
  loading: boolean;
}

function MarketDetailHeader({ onSave, onClose, isSaved, loading }: Props) {
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
        <TouchableOpacity
          onPress={onSave}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            minWidth: 67,
            paddingHorizontal: 10,
            paddingVertical: 8,
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
          className="px-5 py-2.5 bg-tertiary rounded-full"
        >
          <Text className="text-gray-700 font-semibold text-sm">Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default MarketDetailHeader;
