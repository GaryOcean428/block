// This type augmentation is needed for JSX elements
import type { JSX as ReactJSX, HTMLAttributes } from 'react';

// This module augmentation ensures JSX elements work properly with React 19
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: ReactJSX.IntrinsicAttributes & HTMLAttributes<HTMLElement>;
    }
  }
}

// Export to make this a module
export {};
