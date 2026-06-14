import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { colors, gradients, radius } from '../../theme/system';
import { LinearGradient } from 'expo-linear-gradient';

function TabIcon({ focused, icon }: { focused: boolean; icon: string }) {
  return focused ? (
    <LinearGradient
      colors={gradients.brand}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.activeIcon}
    >
      <View />
    </LinearGradient>
  ) : (
    <View style={styles.inactiveIcon} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.glow,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      })}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Inicio', tabBarLabel: 'Inicio' }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Entrena', tabBarLabel: 'Entrena' }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Nutrición', tabBarLabel: 'Nutrición' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarLabel: 'Perfil' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 18,
    left: 24,
    right: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(16,19,25,0.92)',
    borderWidth: 1,
    borderColor: colors.panelBorder,
    height: 60,
    paddingBottom: 0,
    // Shadow
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  tabItem: {
    borderRadius: radius.pill,
  },
  activeIcon: {
    width: 6, height: 6, borderRadius: 3, marginBottom: 2,
  },
  inactiveIcon: {
    width: 6, height: 6, borderRadius: 3, marginBottom: 2,
    backgroundColor: 'transparent',
  },
});
