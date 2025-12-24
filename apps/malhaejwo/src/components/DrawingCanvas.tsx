import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@borine/ui';

export type StrokePoint = { x: number; y: number };
export type Stroke = StrokePoint[];

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

type DrawingCanvasProps = {
  height?: number;
  overlay?: boolean;
  strokes: Stroke[];
  onChangeStrokes: (next: Stroke[]) => void;
  strokeWidth?: number;
};

const STROKE_COLOR = '#FFE169';
const DEFAULT_STROKE_WIDTH = 28;

export function DrawingCanvas({
  height = 340,
  overlay,
  strokes,
  onChangeStrokes,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}: DrawingCanvasProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const activeStrokeRef = useRef<Stroke | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          activeStrokeRef.current = [{ x: locationX, y: locationY }];
          onChangeStrokes([...strokes, activeStrokeRef.current]);
        },
        onPanResponderMove: (evt) => {
          if (!activeStrokeRef.current) return;
          const { locationX, locationY } = evt.nativeEvent;
          activeStrokeRef.current.push({ x: locationX, y: locationY });
          onChangeStrokes([...strokes.slice(0, -1), activeStrokeRef.current]);
        },
        onPanResponderRelease: () => {
          activeStrokeRef.current = null;
        },
        onPanResponderTerminate: () => {
          activeStrokeRef.current = null;
        }
      }),
    [onChangeStrokes, strokes]
  );

  return (
    <View
      style={[styles.container, overlay ? styles.containerOverlay : null, { height }]}
      onLayout={(e) => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      {...panResponder.panHandlers}
    >
      {overlay ? null : <View style={styles.placeholder} />}
      <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill}>
        {strokes.map((stroke, index) => (
          <Path
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            d={strokeToPath(stroke)}
            stroke={STROKE_COLOR}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.8}
          />
        ))}
      </Svg>
    </View>
  );
}

export function getStrokesBounds(strokes: Stroke[]): Bounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const stroke of strokes) {
    for (const point of stroke) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { minX, minY, maxX, maxY };
}

function strokeToPath(stroke: Stroke): string {
  if (!stroke.length) return '';
  const [first, ...rest] = stroke;
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(' ');
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden'
  },
  containerOverlay: {
    borderWidth: 0,
    backgroundColor: 'transparent'
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FBF8F4'
  }
});
