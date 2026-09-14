/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Moon, Sparkles, Sun } from 'lucide-react';
import type { EdunixoAppearance } from '../lib/appearance';

interface AppearanceSwitcherProps {
  value: EdunixoAppearance;
  onChange: (value: EdunixoAppearance) => void;
  compact?: boolean;
}

const choices: Array<{
  value: EdunixoAppearance;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'light', label: 'Light theme', shortLabel: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark theme', shortLabel: 'Dark', Icon: Moon },
  { value: 'aurora', label: 'Animated colourful theme', shortLabel: 'Aurora', Icon: Sparkles }
];

export default function AppearanceSwitcher({ value, onChange, compact = false }: AppearanceSwitcherProps) {
  return (
    <div
      className={`edx-appearance-switcher no-print ${compact ? 'edx-appearance-switcher-compact' : ''}`}
      role="group"
      aria-label="Choose display theme"
    >
      <span className="edx-appearance-label">Theme</span>
      <div className="edx-appearance-options">
        {choices.map(({ value: option, label, shortLabel, Icon }) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              className="edx-appearance-option"
              data-active={active ? 'true' : 'false'}
              data-theme-option={option}
              aria-pressed={active}
              aria-label={label}
              title={label}
              onClick={() => onChange(option)}
            >
              <Icon className="h-4 w-4" />
              <span>{shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
