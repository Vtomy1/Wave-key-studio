import React, { useCallback } from 'react';
import { audioEngine } from '../audio/audioEngine';

interface KeyConfig {
  key: string;
  code: string;
  label: string;
  subLabel?: string;
  width?: string; // flex width or w-class
  isSpecial?: boolean;
}

interface VirtualKeyboardProps {
  activeKeys: Set<string>;
  keyCounts: Record<string, number>;
  onKeyPress: (key: string, code: string) => void;
  showNotes: boolean;
}

const KEYBOARD_ROWS: KeyConfig[][] = [
  // Row 1
  [
    { key: '`', code: 'Backquote', label: '`', subLabel: '~' },
    { key: '1', code: 'Digit1', label: '1', subLabel: '!' },
    { key: '2', code: 'Digit2', label: '2', subLabel: '@' },
    { key: '3', code: 'Digit3', label: '3', subLabel: '#' },
    { key: '4', code: 'Digit4', label: '4', subLabel: '$' },
    { key: '5', code: 'Digit5', label: '5', subLabel: '%' },
    { key: '6', code: 'Digit6', label: '6', subLabel: '^' },
    { key: '7', code: 'Digit7', label: '7', subLabel: '&' },
    { key: '8', code: 'Digit8', label: '8', subLabel: '*' },
    { key: '9', code: 'Digit9', label: '9', subLabel: '(' },
    { key: '0', code: 'Digit0', label: '0', subLabel: ')' },
    { key: '-', code: 'Minus', label: '-', subLabel: '_' },
    { key: '=', code: 'Equal', label: '=', subLabel: '+' },
    { key: 'Backspace', code: 'Backspace', label: 'DELETE', width: 'flex-[1.8]', isSpecial: true },
  ],
  // Row 2
  [
    { key: 'Tab', code: 'Tab', label: 'TAB', width: 'flex-[1.4]', isSpecial: true },
    { key: 'q', code: 'KeyQ', label: 'Q' },
    { key: 'w', code: 'KeyW', label: 'W' },
    { key: 'e', code: 'KeyE', label: 'E' },
    { key: 'r', code: 'KeyR', label: 'R' },
    { key: 't', code: 'KeyT', label: 'T' },
    { key: 'y', code: 'KeyY', label: 'Y' },
    { key: 'u', code: 'KeyU', label: 'U' },
    { key: 'i', code: 'KeyI', label: 'I' },
    { key: 'o', code: 'KeyO', label: 'O' },
    { key: 'p', code: 'KeyP', label: 'P' },
    { key: '[', code: 'BracketLeft', label: '[', subLabel: '{' },
    { key: ']', code: 'BracketRight', label: ']', subLabel: '}' },
    { key: '\\', code: 'Backslash', label: '\\', subLabel: '|', width: 'flex-[1.2]' },
  ],
  // Row 3
  [
    { key: 'CapsLock', code: 'CapsLock', label: 'CAPS', width: 'flex-[1.7]', isSpecial: true },
    { key: 'a', code: 'KeyA', label: 'A' },
    { key: 's', code: 'KeyS', label: 'S' },
    { key: 'd', code: 'KeyD', label: 'D' },
    { key: 'f', code: 'KeyF', label: 'F' },
    { key: 'g', code: 'KeyG', label: 'G' },
    { key: 'h', code: 'KeyH', label: 'H' },
    { key: 'j', code: 'KeyJ', label: 'J' },
    { key: 'k', code: 'KeyK', label: 'K' },
    { key: 'l', code: 'KeyL', label: 'L' },
    { key: ';', code: 'Semicolon', label: ';', subLabel: ':' },
    { key: "'", code: 'Quote', label: "'", subLabel: '"' },
    { key: 'Enter', code: 'Enter', label: 'ENTER', width: 'flex-[2.1]', isSpecial: true },
  ],
  // Row 4
  [
    { key: 'Shift', code: 'ShiftLeft', label: 'SHIFT', width: 'flex-[2.2]', isSpecial: true },
    { key: 'z', code: 'KeyZ', label: 'Z' },
    { key: 'x', code: 'KeyX', label: 'X' },
    { key: 'c', code: 'KeyC', label: 'C' },
    { key: 'v', code: 'KeyV', label: 'V' },
    { key: 'b', code: 'KeyB', label: 'B' },
    { key: 'n', code: 'KeyN', label: 'N' },
    { key: 'm', code: 'KeyM', label: 'M' },
    { key: ',', code: 'Comma', label: ',', subLabel: '<' },
    { key: '.', code: 'Period', label: '.', subLabel: '>' },
    { key: '/', code: 'Slash', label: '/', subLabel: '?' },
    { key: 'Shift', code: 'ShiftRight', label: 'SHIFT', width: 'flex-[2.2]', isSpecial: true },
  ],
  // Row 5
  [
    { key: 'Control', code: 'ControlLeft', label: 'CTRL', width: 'flex-[1.4]', isSpecial: true },
    { key: 'Alt', code: 'AltLeft', label: 'ALT', width: 'flex-[1.2]', isSpecial: true },
    { key: ' ', code: 'Space', label: 'SPACEBAR · 808 SUB', width: 'flex-[6.5]', isSpecial: true },
    { key: 'Alt', code: 'AltRight', label: 'ALT', width: 'flex-[1.2]', isSpecial: true },
    { key: 'ArrowLeft', code: 'ArrowLeft', label: '◀', width: 'flex-[1]' },
    { key: 'ArrowUp', code: 'ArrowUp', label: '▲', width: 'flex-[1]' },
    { key: 'ArrowDown', code: 'ArrowDown', label: '▼', width: 'flex-[1]' },
    { key: 'ArrowRight', code: 'ArrowRight', label: '▶', width: 'flex-[1]' },
  ],
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  activeKeys,
  keyCounts,
  onKeyPress,
  showNotes,
}) => {
  // Max count calculation for heat mapping
  const maxCount = Math.max(1, ...Object.values(keyCounts));

  const handlePointerDown = useCallback((k: KeyConfig) => {
    onKeyPress(k.key, k.code);
  }, [onKeyPress]);

  return (
    <div className="w-full bg-[#0D1017] rounded-xl p-3 md:p-4 border border-slate-800 shadow-xl select-none">
      <div className="flex flex-col gap-1.5 md:gap-2">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 md:gap-1.5 w-full">
            {row.map((k) => {
              const lowerKey = k.key.toLowerCase();
              const isPressed = activeKeys.has(lowerKey) || activeKeys.has(k.code.toLowerCase()) || activeKeys.has(k.key);
              const noteData = audioEngine.getKeyNote(k.key);
              const pressCount = keyCounts[lowerKey] || 0;
              const heatRatio = pressCount / maxCount;

              // Heat color calculation
              const heatColor = heatRatio > 0.05
                ? `rgba(245, 158, 11, ${Math.min(0.25, heatRatio * 0.3)})`
                : 'transparent';

              return (
                <button
                  key={`${k.code}-${k.label}`}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handlePointerDown(k);
                  }}
                  className={`relative group flex flex-col items-center justify-center min-w-0 transition-all duration-75 rounded-lg border font-mono ${
                    k.width || 'flex-1'
                  } ${
                    k.code === 'Space' ? 'h-11 md:h-13' : 'h-10 md:h-12'
                  } ${
                    isPressed
                      ? 'translate-y-[2px] bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/50'
                      : 'bg-[#151922] hover:bg-[#1C2230] border-slate-800/90 text-slate-300 shadow-[0_3px_0_0_#0B0E14] hover:border-slate-700'
                  }`}
                  style={{
                    backgroundColor: isPressed ? undefined : heatColor !== 'transparent' ? heatColor : undefined,
                  }}
                >
                  {/* Top Character / Symbol */}
                  <div className="flex items-center gap-1 leading-none">
                    <span className={`font-semibold tracking-wide ${
                      k.isSpecial ? 'text-[9px] md:text-[11px] text-slate-400' : 'text-xs md:text-sm'
                    } ${isPressed ? 'text-cyan-300' : ''}`}>
                      {k.label}
                    </span>
                    {k.subLabel && (
                      <span className="text-[9px] md:text-[10px] text-slate-500 hidden sm:inline">
                        {k.subLabel}
                      </span>
                    )}
                  </div>

                  {/* Musical Note & Hz Indicator */}
                  {showNotes && !k.isSpecial && (
                    <div className="flex items-center gap-1 text-[8px] md:text-[9px] text-slate-400 tracking-tighter mt-0.5 leading-none">
                      <span className={`${isPressed ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                        {noteData.noteName}
                      </span>
                    </div>
                  )}

                  {/* Keystroke Count Heat Dot (if pressed >= 3 times) */}
                  {pressCount >= 3 && (
                    <span className="absolute top-1 right-1 text-[7px] text-amber-500/80 font-mono hidden md:inline">
                      {pressCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
