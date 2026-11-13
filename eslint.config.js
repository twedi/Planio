// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Sürükleme/kaydırma bileşenleri (ReorderableList, SwipeRow, GanttBar, renk seçici) PanResponder'ı
    // ve "en güncel props" değerini ref içinde tutar. Bu kalıp çalışır; React Compiler bu bileşenleri
    // yalnızca derlemeden atlar. Hata yerine uyarı olarak gösterilir.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
