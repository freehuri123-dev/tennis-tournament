import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const variantClass = {
    primary: "bg-court text-white",
    secondary: "border border-line bg-white text-ink",
    danger: "bg-red-600 text-white"
  }[variant];

  return (
    <button
      className={`min-h-12 rounded-lg px-4 py-3 text-lg font-bold active:scale-[0.99] disabled:opacity-50 ${variantClass} ${className}`}
      {...props}
    />
  );
}
