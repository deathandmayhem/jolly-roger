import _ from 'react';

declare module 'react' {
  // Allow passing CSS variables to the style prop
  interface CSSProperties {
      [key: `--${string}`]: string | number
  }
}
