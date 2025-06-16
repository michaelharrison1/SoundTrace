
import React, { useState, useCallback } from 'react';

interface DesktopIconProps {
  id: string;
  name: string;
  iconSrc: string;
  onOpen: () => void;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({ id, name, iconSrc, onOpen }) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = useCallback((event: React.MouseEvent) => {
    // This implementation follows typical desktop behavior:
    // Single click selects, double click opens.
    if (event.detail === 1) {
      setIsSelected(true);
      // To deselect other icons, you'd need global state management or event bubbling.
      // For now, focus makes it selected, blur deselects.
    } 
    // Double click handling will be via onDoubleClick prop
  }, []);
  
  const handleDoubleClick = useCallback(() => {
    onOpen();
    setIsSelected(false); 
  }, [onOpen]);

  const handleBlur = useCallback(() => {
    // Small timeout to allow double click to register before blur deselects
    setTimeout(() => {
         if (document.activeElement !== document.getElementById(`desktop-icon-${id}`)) {
            setIsSelected(false);
        }
    }, 0);
  }, [id]);
  
  const handleFocus = useCallback(() => {
      setIsSelected(true);
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
      setIsSelected(false);
    }
  }, [onOpen]);
  
  // Improved name splitting logic for better visual balance
  let line1 = name;
  let line2 = '';
  if (name.length > 11) { // Adjusted length for better trigger
    const words = name.split(' ');
    if (words.length > 1) {
      let splitPoint = Math.ceil(words.length / 2);
      // Try to balance lines better
      if (words.length === 2 && words[0].length > 7) splitPoint = 1;
      if (words.length === 3 && words[0].length + words[1].length < 12) splitPoint = 2;

      line1 = words.slice(0, splitPoint).join(' ');
      line2 = words.slice(splitPoint).join(' ');
      
      // If line1 is still too long, or line2 is too short and line1 could give a word
      if (line1.length > 11 && line2) {
         const line1Words = line1.split(' ');
         if (line1Words.length > 1) {
            line2 = `${line1Words.pop()} ${line2}`;
            line1 = line1Words.join(' ');
         }
      }
      if (line1.length > 11) line1 = line1.substring(0,10) + '...';
      if (line2 && line2.length > 11) line2 = line2.substring(0,10) + '...';

    } else { // Single very long word
      line1 = name.substring(0, 10) + '...';
    }
  }


  return (
    <div
      id={`desktop-icon-${id}`}
      className={`desktop-icon-container ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyPress}
      tabIndex={0} 
      role="button"
      aria-label={`Open ${name}`}
      title={name} // Tooltip for full name
    >
      <img src={iconSrc} alt="" /> {/* Decorative, aria-label on parent */}
      <span>{line1}</span>
      {line2 && <span>{line2}</span>}
    </div>
  );
};

export default React.memo(DesktopIcon);
