/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../types';

interface UrduWrapperProps {
  lang: Language;
  children: React.ReactNode;
  className?: string;
}

export default function UrduWrapper({ lang, children, className = "" }: UrduWrapperProps) {
  const isUrdu = lang === 'ur';
  const isHindi = lang === 'hi';

  const fontClass = isUrdu 
    ? "font-urdu tracking-normal text-right rtl" 
    : isHindi 
    ? "font-hindi tracking-normal text-left ltr" 
    : "font-sans tracking-normal text-left ltr";

  return (
    <div 
      dir={isUrdu ? 'rtl' : 'ltr'} 
      className={`${fontClass} ${className}`}
      style={{
        unicodeBidi: isUrdu ? 'plaintext' : 'normal',
        textAlign: isUrdu ? 'right' : 'left',
      }}
    >
      {children}
    </div>
  );
}
