import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'; // Variants might have less distinction in W95
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  ...props
}) => {
  const baseStyles = "font-normal focus:outline-none active:shadow-[1px_1px_0px_#000000] active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white active:translate-x-[1px] active:translate-y-[1px] transition-none";
  // Classic Win95 button: gray background, 3D outset border
  // On active/press: border insets, content shifts slightly
  
  const win95Base = "bg-[#C0C0C0] text-black border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] shadow-[1px_1px_0px_#000000]";

  const sizeStyles = {
    sm: "px-3 py-1 text-base", // VT323 is small, so base size might be larger
    md: "px-4 py-1.5 text-base",
    lg: "px-6 py-2 text-lg",
  };
  
  let variantSpecificStyles = "";
  if (variant === 'danger') {
    // Danger buttons in W95 usually weren't drastically different, maybe just text color or specific context
    // For now, keep it similar or slightly distinct if needed.
    // variantSpecificStyles = "text-red-700"; // Or a more pixelated red
  } else if (variant === 'secondary') {
    // Secondary might be less prominent or used for different actions.
    // In W95, most buttons looked the same.
  }

  // Primary and default are standard gray W95 buttons.

  return (
    <button
      type="button"
      className={`${baseStyles} ${win95Base} ${sizeStyles[size]} ${variantSpecificStyles} ${props.disabled ? 'text-gray-500 opacity-70 cursor-not-allowed active:!shadow-[1px_1px_0px_#000000] active:!border-t-white active:!border-l-white active:!border-b-[#808080] active:!border-r-[#808080] active:!translate-x-0 active:!translate-y-0' : ''} ${className || ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        // Simple text loading for retro feel
        <span>Loading...</span>
      ) : (
        icon && <span className="mr-1 -ml-0.5 inline-block align-middle [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      )}
      <span className="inline-block align-middle">{children}</span>
    </button>
  );
};

export default React.memo(Button);
