import BottomSheetHeader from './BottomSheetHeader';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { screenHeight, useBottomSheet } from '../../hook/useBottomSheet';
import MarketList from '../marketList/MarketList';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearch } from '../../context/SearchContext';

type SelectedFilter = 'all' | 'near-me' | 'open-now';

function BottomSheet() {
  const { sheetY, scrollOffset, isContentAreaTouched, gesture } =
    useBottomSheet();
  const { loading } = useSearch();

  const scrollRef = useRef<any>(null);
  const [scrollViewKey, setScrollViewKey] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<SelectedFilter>('all');
  const initialResetArmedRef = useRef(false);
  const initialResetDoneRef = useRef(false);

  const hardResetListScroll = useCallback(() => {
    scrollOffset.value = 0;
    setScrollViewKey(k => k + 1);
  }, [scrollOffset]);

  // One-time reset after initial load to avoid iOS ScrollView offset/bounce glitches.
  useEffect(() => {
    if (!loading) {
      initialResetArmedRef.current = true;
    }
  }, [loading]);

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
          key={`bottomsheet-list-${scrollViewKey}`}
          ref={scrollRef}
          className="bg-white"
          onScroll={e => {
            scrollOffset.value = e.nativeEvent.contentOffset.y;
          }}
          onContentSizeChange={(_w, h) => {
            if (
              initialResetArmedRef.current &&
              !initialResetDoneRef.current &&
              !loading
            ) {
              initialResetDoneRef.current = true;
              initialResetArmedRef.current = false;
              hardResetListScroll();
            }
          }}
          scrollEventThrottle={16}
          onTouchStart={() => (isContentAreaTouched.value = true)}
          onTouchEnd={() => (isContentAreaTouched.value = false)}
          style={{ marginBottom: 230 }}
        >
          <MarketList
            onUserChangedFilter={hardResetListScroll}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
          />
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

export default BottomSheet;
