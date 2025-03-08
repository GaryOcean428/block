import * as React from 'react';

// This module augmentation ensures JSX elements work properly with React 19
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Export to make this a module
export {};
