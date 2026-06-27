import React from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

function Box({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  const o = useSharedValue(0.3);
  React.useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(0.7, { duration: 700 }), withTiming(0.3, { duration: 700 })), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: w as any, height: h, borderRadius: r, backgroundColor: '#ffffff15' }, s]} />;
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ gap: 14, paddingVertical: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Box w={40} h={40} r={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <Box w="55%" h={13} />
            <Box w="35%" h={11} />
          </View>
        </View>
      ))}
    </View>
  );
}
