import React from 'react';
import { DotmSquare13 } from './ui/dotm-square-13';

interface AppPreloaderProps {
  visible: boolean;
}

export function AppPreloader({ visible }: AppPreloaderProps) {
  return (
    <div className={`app-preloader ${visible ? 'app-preloader-visible' : 'app-preloader-hidden'}`}>
      <DotmSquare13 size={86} dotSize={8} speed={1.25} bloom />
    </div>
  );
}
