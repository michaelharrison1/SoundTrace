
import React, { useCallback } from 'react'; // Removed useState

interface DesktopIconProps {
  id: string;
  name: string;
  iconSrc: string;
  onOpen: () => void; // Will be an empty function from App.tsx
}

const DesktopIcon: React.FC<DesktopIconProps> = ({ id, name, iconSrc, onOpen }) => {
  // Removed isSelected state and all event handlers (handleClick, handleDoubleClick, etc.)
  // Icons are now purely decorative. The onOpen prop will be a no-op from App.tsx.

  // Improved name splitting logic for better visual balance
  let line1 = name;
  let line2 = '';
  if (name.length > 11) {
    const words = name.split(' ');
    if (words.length > 1) {
      let splitPoint = Math.ceil(words.length / 2);
      if (words.length === 2 && words[0].length > 7) splitPoint = 1;
      if (words.length === 3 && words[0].length + words[1].length < 12) splitPoint = 2;

      line1 = words.slice(0, splitPoint).join(' ');
      line2 = words.slice(splitPoint).join(' ');

      if (line1.length > 11 && line2) {
         const line1Words = line1.split(' ');
         if (line1Words.length > 1) {
            line2 = `${line1Words.pop()} ${line2}`;
            line1 = line1Words.join(' ');
         }
      }
      if (line1.length > 11) line1 = line1.substring(0,10) + '...';
      if (line2 && line2.length > 11) line2 = line2.substring(0,10) + '...';

    } else {
      line1 = name.substring(0, 10) + '...';
    }
  }

  return (
    <div
      id={`desktop-icon-${id}`}
      className="desktop-icon-container" // Removed 'selected' class logic
      title={name} // Tooltip for full name still useful
      // Removed onClick, onDoubleClick, onFocus, onBlur, onKeyDown, tabIndex, role, aria-label
    >
      <img src={iconSrc} alt="" /> {/* Alt remains empty as parent div has title */}
      <span>{line1}</span>
      {line2 && <span>{line2}</span>}
    </div>
  );
};

export default React.memo(DesktopIcon);
