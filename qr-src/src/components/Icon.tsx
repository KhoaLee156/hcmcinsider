import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'create' | 'scan' | 'history' | 'about';

/** Simple 24px line icons (2px stroke, round caps). */
export default function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'create' && (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={1.5} {...p} />
          <Rect x={14} y={3} width={7} height={7} rx={1.5} {...p} />
          <Rect x={3} y={14} width={7} height={7} rx={1.5} {...p} />
          <Path d="M14 17.5h7M17.5 14v7" {...p} />
        </>
      )}
      {name === 'scan' && (
        <>
          <Path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" {...p} />
          <Path d="M7 12h10" {...p} />
        </>
      )}
      {name === 'history' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 7v5l3 2" {...p} />
        </>
      )}
      {name === 'about' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v6M12 7.5v.01" {...p} />
        </>
      )}
    </Svg>
  );
}
