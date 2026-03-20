
import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withSpring } from 'react-native-reanimated';

export const { height: screenHeight } = Dimensions.get('screen');

export const MIN_Y = 147; // 바텀시트가 최대로 높이 올라갔을 때의 y 값
export const MAX_Y = screenHeight - 60; // 바텀시트가 최소로 내려갔을 때의 y 값
export const BOTTOM_SHEET_HEIGHT = screenHeight - MIN_Y; // 바텀시트의 세로 길이

/** BottomSheet snap positions (Y from top of screen) */
const SNAP_POINTS = {
  FULL: 147,                // sheet fully expanded
  HALF: screenHeight * 0.45,// middle position
  CLOSED: screenHeight - 150,// collapsed
};


export function useBottomSheet() {
  /** current Y position of the sheet */
  const sheetY = useSharedValue(SNAP_POINTS.CLOSED);

  /** sheet position when gesture starts */
  const gestureStartSheetY = useSharedValue(0);

  /** current scroll offset of the list */
  const scrollOffset = useSharedValue(0);

  /** total scrollable content height */
  const contentHeight = useSharedValue(0);

  /** visible height of ScrollView */
  const scrollViewHeight = useSharedValue(0);

  /** max scroll position (contentHeight - visibleHeight) */
  const maxScroll = useSharedValue(0);

  /** flag when sheet is currently being dragged */
  const isDraggingSheet = useSharedValue(false);
  const isScrollReady = useSharedValue(false);

  /** clamp helper */
  const clamp = (value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      gestureStartSheetY.value = sheetY.value;
      isDraggingSheet.value = true;
    })
    .onUpdate(e => {

      if (!isScrollReady.value) return;

      const draggingDown = e.translationY > 0;
      const draggingUp = e.translationY < 0;

      const atTop = scrollOffset.value <= 5;

      /**
       * Ownership rules
       *
       * 1. If list can still scroll → list owns gesture
       * 2. If at top & dragging down → sheet owns
       * 3. If at bottom & dragging up → list continues scroll
       */

      const canDragSheet =
      (atTop && draggingDown) ||
      (sheetY.value > SNAP_POINTS.FULL && draggingUp);
      if (!canDragSheet) return;

      const nextY = gestureStartSheetY.value + e.translationY;

      sheetY.value = clamp(
        nextY,
        SNAP_POINTS.FULL,
        SNAP_POINTS.CLOSED
      );
    })

    .onEnd(e => {
      isDraggingSheet.value = false;

      const currentY = sheetY.value;
      const velocityY = e.velocityY;

      const points = Object.values(SNAP_POINTS);

      /** find nearest snap point */
      let closest = points[0];
      let minDist = Math.abs(currentY - points[0]);

      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(currentY - points[i]);
        if (dist < minDist) {
          closest = points[i];
          minDist = dist;
        }
      }

      /**
       * velocity assist
       * fast swipe moves to next snap
       */
      if (velocityY > 800) {
        closest = SNAP_POINTS.CLOSED;
      } else if (velocityY < -800) {
        closest = SNAP_POINTS.FULL;
      }

      sheetY.value = withSpring(closest, {
        damping: 40,
        stiffness: 180,
      });
    });

  const collapse = useCallback(() => {
    sheetY.value = withSpring(SNAP_POINTS.CLOSED, {
      damping: 40,
      stiffness: 180,
    });
  }, [sheetY]);

  return {
    sheetY,

    /** scroll offset from ScrollView */
    scrollOffset,

    /** content height (set from onContentSizeChange) */
    contentHeight,

    /** visible ScrollView height (set from onLayout) */
    scrollViewHeight,

    /** calculated max scroll */
    maxScroll,

    /** sheet drag state */
    isDraggingSheet,

    /** pan gesture for sheet */
    gesture,
    isScrollReady,

    /** collapse sheet to closed position */
    collapse,
  };
}
