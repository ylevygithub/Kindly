import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFB830', '#FF8FAB', '#C4B5FD', '#4ADE80', '#FB923C', '#38BDF8'];
const CONFETTI_COUNT = 30;

export interface ConfettiRef {
  trigger: () => void;
}

interface ConfettiPiece {
  id: number;
  color: string;
  x: number;
  size: number;
  isCircle: boolean;
}

const pieces: ConfettiPiece[] = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  x: Math.random() * SCREEN_WIDTH,
  size: 6 + Math.random() * 8,
  isCircle: Math.random() > 0.5,
}));

function ConfettiPieceView({
  piece,
  progress,
}: {
  piece: ConfettiPiece;
  progress: ReturnType<typeof useSharedValue<number>>;
}) {
  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p > 0 && p < 0.85 ? 1 : 0,
      transform: [
        { translateY: p * SCREEN_HEIGHT * 0.9 },
        { rotate: `${p * 720}deg` },
        { scale: 1 - p * 0.3 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -20,
          left: piece.x,
          width: piece.size,
          height: piece.size,
          backgroundColor: piece.color,
          borderRadius: piece.isCircle ? piece.size / 2 : 2,
        },
        animStyle,
      ]}
    />
  );
}

const ConfettiAnimation = forwardRef<ConfettiRef>((_, ref) => {
  const progress = useSharedValue(0);
  const [visible, setVisible] = React.useState(false);

  const trigger = () => {
    setVisible(true);
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 0 })
    );
    setTimeout(() => setVisible(false), 1400);
  };

  useImperativeHandle(ref, () => ({ trigger }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceView key={piece.id} piece={piece} progress={progress} />
      ))}
    </View>
  );
});

ConfettiAnimation.displayName = 'ConfettiAnimation';

export default ConfettiAnimation;
