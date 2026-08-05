import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { Link, type LinkProps } from "react-router-dom";

import { cn } from "../../lib/cn";

import {
  buttonStyles,
  type ButtonSize,
  type ButtonVariant,
} from "./button-styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles(variant, size, className)}
      {...props}
    />
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  disabled,
  onClick,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={buttonStyles(
        variant,
        size,
        cn(className, disabled && "pointer-events-none opacity-50")
      )}
      {...props}
    />
  );
}
