
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'; // Variants might have less distinction in W95
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  className?: string; 
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '', 
  ...props
}) => {
  const baseStyles = "font-normal focus:outline-none transition-none rounded-none"; // Keep rounded-none for sharp edges
  
  // Win95-like 3D effect using borders and shadows
  // These classes are defined globally in index.html or a main CSS file for Win95 theme
  const win95Base = "bg-[#C0C0C0] text-black border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] shadow-[1px_1px_0px_#000000]";
  const activeWin95 = "active:shadow-[0px_0px_0px_#000000] active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white active:translate-x-[1px] active:translate-y-[1px]";

  const sizeStyles = {
    sm: "px-3 py-1 text-sm", // Adjusted for VT323 pixel font. py-1 is closer to original W95 button heights
    md: "px-4 py-1.5 text-base", // Default/medium size
    lg: "px-6 py-2 text-lg",
  };
  
  const variantSpecificStyles = "";
  if (variant === 'danger') {
     // For danger, you might slightly change background or border colors if desired,
     // but Win95 buttons were mostly gray. Context usually indicated danger.
     // Example: variantSpecificStyles = "!bg-red-500 !text-white !border-red-700 hover:!bg-red-600";
  } else if (variant === 'secondary') {
    // variantSpecificStyles = "hover:bg-gray-300"; // Example, but base Win95 style already good
  }

  // Combining base, Win95 specific, size, variant, and passed className
  const combinedClassName = `${baseStyles} ${win95Base} ${sizeStyles[size]} ${variantSpecificStyles} ${props.disabled || isLoading ? 'text-gray-500 opacity-70 cursor-not-allowed !shadow-[1px_1px_0px_#000000] !border-t-white !border-l-white !border-b-[#808080] !border-r-[#808080] !translate-x-0 !translate-y-0' : activeWin95} ${className}`;


  return (
    <button
      type="button" // Default to button, can be overridden by props
      className={combinedClassName}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="animate-pulse">Loading...</span> // Simple text loading
      ) : (
        <>
          {icon && <span className="mr-1 -ml-0.5 inline-block align-middle [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
          <span className="inline-block align-middle">{children}</span>
        </>
      )}
    </button>
  );
};

export default React.memo(Button);
