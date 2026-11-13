import React, { useEffect } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Ortak animasyon parçaları (react-native-reanimated).
 * Tüm ekranlar aynı süre ve yay ayarlarını kullansın diye burada toplandı.
 */

/**
 * Yay (spring) ayarı: neredeyse hiç sekmeyen, hızlı oturan hareket.
 * Not: Reanimated 4'te varsayılan kütle 4, sertlik 900. Yalnızca "damping" verip
 * gerisini varsayılana bırakmak düğmeleri uzun süre sallıyordu; üç değer hep birlikte verilir.
 */
export const SPRING = { damping: 30, stiffness: 320, mass: 1 };

/** Uygulama genelinde ortak süreler (ms) ve yumuşatma eğrisi */
export const DURATION = { press: 90, release: 170, fast: 180, base: 240, slow: 380 };
export const EASE_OUT = Easing.out(Easing.cubic);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Basılınca hafifçe küçülen dokunma alanı (stil doğrudan bu öğeye uygulanır: flex, margin vb. çalışır) */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: React.ReactNode }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: DURATION.press, easing: EASE_OUT }));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: DURATION.release, easing: EASE_OUT }));
        rest.onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Liste öğesi: ilk görünüşte aşağıdan yumuşakça gelir (sıralı gecikmeyle),
 * kaldırılınca söner, diğer öğeler yeni yerlerine kayarak geçer.
 */
export function ListItem({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(280).delay(Math.min(index, 6) * 35).easing(EASE_OUT)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(DURATION.base).easing(EASE_OUT)}
    >
      {children}
    </Animated.View>
  );
}

/** Ekran bölümlerinin girişte yumuşakça belirmesi */
export function FadeInUp({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View style={style} entering={FadeInDown.duration(320).delay(delay).easing(EASE_OUT)}>
      {children}
    </Animated.View>
  );
}

/** Sekmesiz düz belirme (rozetler, küçük göstergeler) */
export function FadeInView({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View style={style} entering={FadeIn.duration(DURATION.base).delay(delay)} exiting={FadeOut.duration(140)}>
      {children}
    </Animated.View>
  );
}

/** Yavaşça yukarı aşağı süzülme (boş durum simgeleri) */
export function Floating({ children, distance = 5, style }: { children: React.ReactNode; distance?: number; style?: StyleProp<ViewStyle> }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withRepeat(withTiming(-distance, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [distance, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Değer değişince tek, küçük bir "nabız" (sayaçlar, onay işaretleri). Sallanma yok. */
export function usePop(trigger: unknown) {
  const s = useSharedValue(1);
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    s.set(
      withSequence(
        withTiming(0.88, { duration: 70, easing: EASE_OUT }),
        withTiming(1.06, { duration: 110, easing: EASE_OUT }),
        withTiming(1, { duration: 130, easing: EASE_OUT })
      )
    );
  }, [trigger, s]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
}
