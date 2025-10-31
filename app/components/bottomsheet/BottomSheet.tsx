import { Text } from 'react-native';
import BottomSheetHeader from './BottomSheetHeader';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { screenHeight, useBottomSheet } from '../../hook/useBottomSheet';

function BottomSheet() {
  const { sheetY, scrollOffset, isContentAreaTouched, gesture } =
    useBottomSheet();

  // 스타일 적용
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        className="flex flex-col z-1 w-full bg-gray-400 rounded-t-3xl absolute left-0 shadow-lg"
        style={[
          {
            height: screenHeight, // 전체 높이 확보
          },
          animatedStyle,
        ]}
      >
        <BottomSheetHeader />
        <ScrollView
          onScroll={e => {
            scrollOffset.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onTouchStart={() => (isContentAreaTouched.value = true)}
          onTouchEnd={() => (isContentAreaTouched.value = false)}
          contentContainerStyle={{ padding: 20 }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>
            Market List
          </Text>
          {Array.from({ length: 30 }).map((_, i) => (
            <Text key={i} style={{ paddingVertical: 8 }}>
              Item {i + 1}
            </Text>
          ))}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

export default BottomSheet;
