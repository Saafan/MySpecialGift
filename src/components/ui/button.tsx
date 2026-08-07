import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ember-600 text-white hover:bg-ember-700 active:bg-ember-800",
        secondary: "bg-ink text-paper hover:bg-ink/85 active:bg-ink/75",
        outline:
          "border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-cream/60",
        ghost: "text-ink-soft hover:bg-cream hover:text-ink",
        danger: "bg-danger-600 text-white hover:bg-danger-700",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-11 w-11",
        iconSm: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/** Class builder for link-shaped-like-button cases (used with next/link). */
export { buttonVariants };
