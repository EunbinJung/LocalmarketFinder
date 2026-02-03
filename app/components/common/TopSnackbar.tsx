import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SnackbarType = 'info' | 'success' | 'error';

type Snack = { message: string; type: SnackbarType };

export function useTopSnackbar(opts?: { durationMs?: number }) {
  const insets = useSafeAreaInsets();
  const durationMs = typeof opts?.durationMs === 'number' ? opts.durationMs : 1600;

  const [snack, setSnack] = useState<Snack | null>(null);
  const anim = useRef(new Animated.Value(0)).current; // 0 hidden -> 1 shown
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = useCallback(
    (message: string, type: SnackbarType = 'info') => {
      setSnack({ message, type });

      if (timerRef.current) clearTimeout(timerRef.current);
      anim.stopAnimation();
      anim.setValue(0);

      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setSnack(null);
        });
      }, durationMs);
    },
    [anim, durationMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const element = useMemo(() => {
    if (!snack) return null;

    const theme =
      snack.type === 'error'
        ? { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '⚠️' }
        : snack.type === 'success'
          ? { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: '✅' }
          : { bg: '#FFFFFF', border: '#E5E7EB', text: '#374151', icon: '💡' };

    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [-18, 0],
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 9999,
          elevation: 9999,
          opacity: anim,
          transform: [{ translateY }],
        }}
      >
        <View
          className="rounded-2xl px-4 py-3 border"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.border,
          }}
        >
          <Text className="font-semibold" style={{ color: theme.text }}>
            {theme.icon} {snack.message}
          </Text>
        </View>
      </Animated.View>
    );
  }, [anim, insets.top, snack]);

  return { snackbar: element, showSnackbar };
}

