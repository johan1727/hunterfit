import React from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

function SkeletonBox({ width, height, borderRadius = 8, style }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 700 }), withTiming(0.3, { duration: 700 })),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#ffffff15' }, animStyle, style]}
    />
  );
}

export function RecipeCardSkeleton() {
  return (
    <View style={{
      width: 280, height: 200, borderRadius: 20, overflow: 'hidden',
      marginRight: 16, backgroundColor: '#ffffff08', padding: 16, gap: 12,
    }}>
      <SkeletonBox width="60%" height={20} />
      <SkeletonBox width="90%" height={14} />
      <SkeletonBox width="70%" height={14} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <SkeletonBox width={60} height={28} borderRadius={14} />
        <SkeletonBox width={60} height={28} borderRadius={14} />
        <SkeletonBox width={60} height={28} borderRadius={14} />
      </View>
    </View>
  );
}

export function RecipeIngredientSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <SkeletonBox width={44} height={44} borderRadius={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="60%" height={13} />
        <SkeletonBox width="40%" height={11} />
      </View>
    </View>
  );
}
