import React from 'react';
import { ForgeXTheme, ThemeEffectType } from '../types';
import { ThemeEffectBackground } from './ThemeEffectBackground';

interface StarFieldProps {
  theme: ForgeXTheme;
  reduceMotion?: boolean;
  intensity?: 'full' | 'subtle';
  effect?: ThemeEffectType;
}

export const StarField: React.FC<StarFieldProps> = ({
  theme,
  reduceMotion = false,
  intensity = 'full',
  effect = 'stars',
}) => {
  return (
    <ThemeEffectBackground
      theme={theme}
      reduceMotion={reduceMotion}
      intensity={intensity}
      effect={effect}
    />
  );
};
