import BottomSheetHeader from './BottomSheetHeader';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { screenHeight, useBottomSheet } from '../../hook/useBottomSheet';
import MarketList from '../marketList/MarketList';

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
          className="bg-white"
          onScroll={e => {
            scrollOffset.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onTouchStart={() => (isContentAreaTouched.value = true)}
          onTouchEnd={() => (isContentAreaTouched.value = false)}
          style={{ marginBottom: 230 }}
        >
          <MarketList />
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

export default BottomSheet;
