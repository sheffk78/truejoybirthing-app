import React from 'react';
import BrandedLoader, { BrandedLoaderColors } from './BrandedLoader';
import { useColors } from '../hooks/useThemedStyles';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const colors = useColors();

  const loaderColors: BrandedLoaderColors = {
    background: colors.background,
    text: colors.text,
    textSecondary: colors.textSecondary,
    primary: colors.primary,
  };

  return <BrandedLoader message={message} colors={loaderColors} />;
}