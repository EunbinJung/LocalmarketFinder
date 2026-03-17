import { Text, View } from 'react-native';

interface ScheduleDay {
  day: string;
  date: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

interface Props {
  weeklySchedule: ScheduleDay[];
}

function MarketSchedule({ weeklySchedule }: Props) {
  return (
    <View
      className="mb-5 pb-5 bg-white rounded-3xl p-5"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-center gap-2 mb-4">
        <View className="bg-secondary w-10 h-10 rounded-full justify-center items-center">
          <Text className="text-xl">📅</Text>
        </View>
        <Text className="text-lg font-bold text-gray-800">Date and Time</Text>
      </View>
      {weeklySchedule.length > 0 ? (
        <View className="gap-2 ml-12">
          {weeklySchedule.map((day, index) => (
            <View key={index} className="bg-tertiary rounded-2xl p-3">
              <Text className="text-gray-800 font-semibold text-base mb-1">{day.day} {day.date}</Text>
              <Text className="text-primary font-semibold text-sm">{day.openTime} - {day.closeTime}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="bg-tertiary rounded-2xl p-4 ml-12">
          <Text className="text-gray-500 text-sm text-center">No schedule available</Text>
        </View>
      )}
    </View>
  );
}

export default MarketSchedule;
