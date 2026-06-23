import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radius, spacing } from '../../theme/system';
import { LinearGradient } from 'expo-linear-gradient';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: Array<{ name: string; label: string; icon: IconName; iconActive: IconName }> = [
  { name: 'home',      label: 'Inicio',   icon: 'home-outline',        iconActive: 'home' },
  { name: 'workouts',  label: 'Entrena',  icon: 'barbell-outline',     iconActive: 'barbell' },
  { name: 'nutrition', label: 'Nutrición',icon: 'restaurant-outline',  iconActive: 'restaurant' },
  { name: 'profile',   label: 'Perfil',   icon: 'person-outline',      iconActive: 'person' },
];

function TabIcon({ icon, iconActive, focused }: { icon: IconName; iconActive: IconName; focused: boolean }) {
  const dotStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    transform: [{ scaleX: withSpring(focused ? 1 : 0, { damping: 14 }) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.08 : 1, { damping: 12, stiffness: 200 }) }],
  }));

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? iconActive : icon}
          size={22}
          color={focused ? colors.glow : colors.textFaint}
        />
      </Animated.View>
      <Animated.View style={[styles.activeDot, dotStyle]}>
        <LinearGradient
          colors={gradients.brand as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.activeDotInner}
        />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel }}
    >
      {TABS.map(({ name, label, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarLabel: label,
            tabBarActiveTintColor: colors.glow,
            tabBarInactiveTintColor: colors.textFaint,
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={icon} iconActive={iconActive} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 18,
    left: 20,
    right: 20,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(14,17,23,0.96)',
    borderWidth: 1,
    borderColor: colors.panelBorder,
    height: 64,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  iconWrap: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  activeDot: {
    width: 20,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  activeDotInner: {
    flex: 1,
  },
});
