import BottomSheetHeader from './BottomSheetHeader';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { BOTTOM_SHEET_HEIGHT, useBottomSheet } from '../../hook/useBottomSheet';
import MarketList from '../marketList/MarketList';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearch } from '../../context/SearchContext';

type SelectedFilter = 'all' | 'near-me' | 'open-now';

function BottomSheet() {
  const { sheetY, scrollOffset, contentHeight, scrollViewHeight, maxScroll, gesture, isScrollReady } =
    useBottomSheet();
  const { loading } = useSearch();

  const scrollRef = useRef<ScrollView>(null);
  const [selectedFilter, setSelectedFilter] = useState<SelectedFilter>('all');
  const [layoutHeight, setLayoutHeight] = useState(0);

  // 초기 스크롤 리셋
  const hardResetListScroll = useCallback(() => {
    scrollOffset.value = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollOffset]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      hardResetListScroll();
    }
  }, [loading, hardResetListScroll]);

  // 애니메이션 스타일
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          { height: BOTTOM_SHEET_HEIGHT },
          animatedStyle
        ]}
        className="flex flex-col w-full bg-gray-400 rounded-t-3xl absolute left-0 shadow-lg"
      >
        <BottomSheetHeader />

        <ScrollView
          ref={scrollRef}
          bounces={false}
          scrollEventThrottle={16}
          className="bg-white"

          contentContainerStyle={{ paddingBottom: 230 }}
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== layoutHeight) {
              setLayoutHeight(h);
              scrollViewHeight.value = h;

              // contentHeight가 이미 계산되었다면 maxScroll도 업데이트
              if (contentHeight.value > 0) {
                maxScroll.value = Math.max(0, contentHeight.value - h);
                isScrollReady.value = maxScroll.value > 0;
              }
            }
          }}
          onContentSizeChange={(_w, h) => {
            if (h === 0 || h === contentHeight.value) return;

            contentHeight.value = h;

            if (layoutHeight > 0) {
              maxScroll.value = Math.max(0, h - layoutHeight);
              isScrollReady.value = maxScroll.value > 0;
            }
          }}
          onScroll={e => {
            scrollOffset.value = e.nativeEvent.contentOffset.y;
          }}
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
