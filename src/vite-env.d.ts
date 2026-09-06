/// <reference types="vite/client" />

declare module '*.css?inline' {
  const css: string;
  export default css;
}

// React 19 przeniosło przestrzeń JSX pod React.JSX - augmentacja globalnego
// `JSX` nie jest już widziana przez kompilator, trzeba rozszerzyć moduł 'react'.
import type * as React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      /** Web-component Home Assistant do renderowania ikon mdi:* - dostępny
       *  globalnie w DOM, gdy panel działa wewnątrz HA. */
      'ha-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { icon?: string };
    }
  }
}
