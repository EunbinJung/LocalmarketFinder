import { Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withSpring } from 'react-native-reanimated';

export const { height: screenHeight } = Dimensions.get('screen');

export const MIN_Y = 147; // 바텀시트가 최대로 높이 올라갔을 때의 y 값
export const MAX_Y = screenHeight - 60; // 바텀시트가 최소로 내려갔을 때의 y 값
export const BOTTOM_SHEET_HEIGHT = screenHeight - MIN_Y; // 바텀시트의 세로 길이

/** 스냅 포인트 설정 */
const SNAP_POINTS = {
  FULL: 147, // 완전 열린 상태
  HALF: screenHeight * 0.45, // 중간쯤
  CLOSED: screenHeight - 150, // 닫힌 상태
};
/** 닫히는 기준 거리 */
const CLOSE_THRESHOLD = 80;

export function useBottomSheet() {
  /** 현재 시트의 위치 (Y축) */
  const sheetY = useSharedValue(SNAP_POINTS.CLOSED);
  const prevTouchY = useSharedValue(0);
  const direction = useSharedValue<'none' | 'up' | 'down'>('none');
  const scrollOffset = useSharedValue(0);
  const isContentAreaTouched = useSharedValue(false);

  // 제스처 정의
  const gesture = Gesture.Pan()
    .onStart(e => {
      prevTouchY.value = e.y;
    })
    .onChange(e => {
      if (prevTouchY.value !== null) {
        direction.value =
          e.y > prevTouchY.value
            ? 'down'
            : e.y < prevTouchY.value
              ? 'up'
              : 'none';
      }
      prevTouchY.value = e.y;
      // 스크롤이 맨 위가 아닐 때는 시트 이동 X
      if (
        isContentAreaTouched.value &&
        scrollOffset.value > 0 &&
        direction.value === 'down'
      ) {
        return;
      }

      // 위치 업데이트 (clamp)
      const nextY = sheetY.value + e.translationY;
      sheetY.value = Math.min(
        Math.max(nextY, SNAP_POINTS.FULL),
        SNAP_POINTS.CLOSED,
      );
    })
    .onEnd(() => {
      // 스냅 로직
      // 손 뗐을 때 → 가장 가까운 스냅 포인트로 이동
      const currentY = sheetY.value;

      // CLOSE 조건: CLOSE 포인트 근처일 때만
      if (
        direction.value === 'down' &&
        currentY > SNAP_POINTS.CLOSED - CLOSE_THRESHOLD
      ) {
        sheetY.value = withSpring(SNAP_POINTS.CLOSED, {
          damping: 50,
          stiffness: 150,
          mass: 0.8,
        });
        return;
      }

      // 가장 가까운 스냅 포인트 찾기 (FULL, HALF, CLOSED)
      const points = Object.values(SNAP_POINTS);
      let closest = points[0];
      let minDist = Math.abs(currentY - points[0]);
      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(currentY - points[i]);
        if (dist < minDist) {
          closest = points[i];
          minDist = dist;
        }
      }
      sheetY.value = withSpring(closest, { damping: 40 });

      prevTouchY.value = 0;
      direction.value = 'none';
    });

  return {
    sheetY,
    scrollOffset,
    isContentAreaTouched,
    gesture,
  };
}
