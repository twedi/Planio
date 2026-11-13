import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getOpenCardsWithDue, getSettings } from './db/repo';
import { parseHm } from './dates';

const CHANNEL_ID = 'duzen-reminders';

/**
 * Aynı anda kurulacak en fazla görev hatırlatıcısı. İşletim sistemleri bekleyen bildirim
 * sayısını sınırlar; en yakın tarihli görevler kurulur, gerisi sonraki eşitlemede sıraya girer.
 */
const MAX_REMINDERS = 50;

// Bildirim modülünün çalışması için gereken yerel (native) parçalar.
// Expo Go'da bunlar yok; APK'da var. Elle açıp kapatmaya gerek kalmasın diye uygulama kendisi bakar.
const REQUIRED_NATIVE_MODULES = ['ExpoTopicSubscriptionModule'];

function nativeModulesAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go'da çökmemesi için geç yüklenir
    const { requireOptionalNativeModule } = require('expo-modules-core');
    return REQUIRED_NATIVE_MODULES.every((name) => !!requireOptionalNativeModule(name));
  } catch {
    return false;
  }
}

let cached: any = undefined;

function getNotifications(): any | null {
  if (cached !== undefined) return cached;
  // Expo Go'da (ya da modül eksikse) bildirimler sessizce kapalı kalır, uygulama çökmez
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !nativeModulesAvailable()) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go'da çökmemesi için geç yüklenir
    const N = require('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async (n: any) => {
        // Odak süresi bittiğinde uygulama açıksa ekrandaki bildirim yeterli; ikinci kez gösterme
        const show = n?.request?.content?.data?.kind !== 'focus';
        return {
          shouldShowBanner: show,
          shouldShowList: show,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
    cached = N;
  } catch (e) {
    console.warn('Bildirim modülü bu ortamda yüklenemedi (Expo Go olabilir):', e);
    cached = null;
  }
  return cached;
}

async function ensureChannel(Notifications: any): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Görev hatırlatıcıları',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/* ---------- Eşitleme kuyruğu ---------- */

let running: Promise<void> | null = null;
let queued = false;
let queuedAsk = false;

/**
 * Planlı görev bildirimlerini silip güncel veriye göre yeniden kurar.
 * Kart/ayar her değiştiğinde ve uygulama açılırken çağrılır.
 *
 * Çağrılar üst üste binmez: bir eşitleme sürerken gelen istekler tek bir "sonraki tur"da
 * birleştirilir. (Eskiden iki eşitleme iç içe geçip aynı bildirimi iki kez kurabiliyordu.)
 */
export function syncNotifications(askPermission = false): Promise<void> {
  if (running) {
    queued = true;
    queuedAsk = queuedAsk || askPermission;
    return running;
  }
  running = (async () => {
    let ask = askPermission;
    do {
      queued = false;
      await syncOnce(ask);
      ask = queuedAsk;
      queuedAsk = false;
    } while (queued);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce(askPermission: boolean): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    const settings = await getSettings();

    let granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted && (askPermission || settings.remindersOn)) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }

    // Odak sayacının bildirimi dışındaki her şeyi temizle
    const scheduled: any[] = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n?.content?.data?.kind === 'focus') continue;
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (!granted) return;

    await ensureChannel(Notifications);

    const { h, m } = parseHm(settings.checkTime);
    const now = Date.now();

    if (settings.remindersOn) {
      const cards = await getOpenCardsWithDue();
      const upcoming: { id: number; title: string; board: string; date: Date }[] = [];
      for (const c of cards) {
        if (!c.due_at) continue;
        const date = new Date(c.due_at);
        if (!c.due_has_time) date.setHours(h, m, 0, 0); // saati yoksa günlük kontrol saatinde
        if (date.getTime() <= now) continue;
        upcoming.push({ id: c.id, title: c.title, board: c.board_name, date });
      }
      upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
      for (const u of upcoming.slice(0, MAX_REMINDERS)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: u.title,
            body: u.board + ' panosunda bir görevin zamanı geldi',
            data: { kind: 'card', cardId: u.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: u.date, channelId: CHANNEL_ID },
        });
      }
    }

    if (settings.overdueOn) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Günlük kontrol',
          body: 'Bugünkü ve gecikmiş görevlerine göz atmak ister misin?',
          data: { kind: 'daily' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (e) {
    console.warn('Bildirimler kurulamadı:', e);
  }
}

/* ---------- Odak sayacı ---------- */

let focusId: string | null = null;

/** Odak/mola süresi bittiğinde, uygulama arka plandaysa haber verir. Önceki odak bildirimi iptal edilir. */
export async function scheduleFocusEnd(at: Date, title: string, body: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await cancelFocusEnd();
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await ensureChannel(Notifications);
    focusId = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { kind: 'focus' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  } catch (e) {
    console.warn('Odak bildirimi kurulamadı:', e);
  }
}

export async function cancelFocusEnd(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    if (focusId) {
      await Notifications.cancelScheduledNotificationAsync(focusId);
      focusId = null;
      return;
    }
    // Uygulama yeniden başladıysa kimlik kaybolmuş olabilir: türüne göre bul
    const scheduled: any[] = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n?.content?.data?.kind === 'focus') await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch {
    // iptal edilemezse bildirim en kötü ihtimalle bir kez fazladan gelir
  }
}

/* ---------- Bildirime dokunma ---------- */

/**
 * Bir görev hatırlatıcısına dokunulunca o görevin kimliğiyle çağrılır.
 * Uygulama bildirime dokunularak açıldıysa ilk çağrı hemen yapılır. Aboneliği kaldıran fonksiyonu döner.
 */
export function onReminderOpened(open: (cardId: number) => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};
  const handle = (response: any) => {
    const data = response?.notification?.request?.content?.data;
    const id = Number(data?.cardId);
    if (data?.kind === 'card' && Number.isFinite(id) && id > 0) open(id);
  };
  try {
    const last = Notifications.getLastNotificationResponse?.();
    if (last) {
      handle(last);
      Notifications.clearLastNotificationResponse?.();
    }
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
