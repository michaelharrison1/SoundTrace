
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // variant?: 'primary' | 'secondary' | 'danger'; // 98.css doesn't have strong variants by default
  size?: 'sm' | 'md' | 'lg'; // 98.css buttons have standard padding, size variation is minimal
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  // variant = 'primary', // Removed as 98.css buttons are fairly standard
  size = 'md',
  isLoading = false,
  icon,
  className,
  ...props
}) => {
  // 98.css applies most styles directly to <button> elements.
  // This component now primarily handles isLoading and icon placement.
  // Specific sizing beyond default should be handled with custom classes if truly needed.

  let sizeClass = '';
  if (size === 'sm') {
    // 98.css buttons are generally okay-sized. "sm" could mean less padding if customized.
    // For now, we assume 98.css default is 'md'-like.
    // sizeClass = "py-0 px-2 text-xs"; // Example for smaller custom button
  } else if (size === 'lg') {
    // sizeClass = "py-2 px-5 text-lg"; // Example for larger custom button
  }

  return (
    <button
      type="button" // Default to button, can be overridden by props
      className={`${props.disabled || isLoading ? 'cursor-not-allowed opacity-75' : ''} ${className || ''} ${sizeClass}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span>Loading...</span>
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
