import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.DEFAULT,
  } as any),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const MEAL_REMINDERS = [
  { id: 'reminder_desayuno', hour: 8,  minute: 0,  body: 'Registra tu desayuno 🥐 y gana XP' },
  { id: 'reminder_comida',   hour: 13, minute: 30, body: 'Hora de registrar tu comida 🍽️' },
  { id: 'reminder_cena',     hour: 20, minute: 0,  body: 'No olvides registrar tu cena 🌙' },
] as const;

export async function scheduleMealReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  // Cancel only our meal reminders, not other notifications
  await cancelMealReminders();
  for (const r of MEAL_REMINDERS) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: 'HunterFit',
        body: r.body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
      },
    });
  }
}

export async function cancelMealReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('reminder_'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function getRemindersEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier.startsWith('reminder_'));
}
