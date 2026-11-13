# Planio: çevrimdışı kişisel planlayıcı (Expo + React Native)

Panolar, kartlar, basit listeler, takvim, çizelge (Gantt), odak sayacı ve istatistikler.
Tüm veriler yalnızca telefonda (SQLite) saklanır. Hedef platform **Android**'dir.

## Çalıştırma

```bash
npm install
npx expo start -c
```

Telefonda Expo Go ile QR kodu okut (aynı Wi-Fi). Bildirimler Expo Go'da kapalıdır; gerçek
APK'da çalışır.

## Kontroller

```bash
npx tsc --noEmit   # tip denetimi
npx expo lint      # lint
```

## APK

```bash
npx eas-cli@latest build -p android --profile preview
```

## Dosya yapısı

```
src/
  app/                 ekranlar (Expo Router)
    _layout.tsx        kök: font, veritabanı, tema, bildirime dokunma
    (tabs)/            Bugün, Panolar, Listeler, Çizelge, Ayarlar
    board/ card/ task/ pano ve görev ekranları
    checklist/         basit listeler
    focus/[id].tsx     odak sayacı
    calendar.tsx search.tsx stats.tsx templates/
  components/          Button, TaskCard, Motion (ortak animasyonlar), ReorderableList …
  db/                  şema ve göçler (index), sorgular (repo), yedekleme, şablonlar
  notifications.ts     yerel bildirimler
  theme.ts             renkler, yazı stilleri, boşluklar
```

## Bilmen gerekenler

- İçe aktarmalar `@/` kısayolunu kullanır (`@/components/Button` = `src/components/Button`).
- Animasyon süreleri ve eğrileri `src/components/Motion.tsx` içinde tek yerde durur.
- Birbirine bağlı veritabanı yazmaları `src/db/index.ts` içindeki `tx()` ile yapılır
  (tek işlem, sırayla). `tx` içinden tekrar `tx` çağrılmaz.
- Yedek dosyası (JSON) panoları, görevleri, listeleri, şablonları ve ayarları içerir.
- Tarih ve saat seçiciler yalnızca Android'de çalışır (`DateTimePickerAndroid`).
