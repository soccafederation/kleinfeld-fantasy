import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-extrabold uppercase tracking-[0.06em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ground [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-gold-hover skew",
        secondary: "bg-card text-text border border-border-strong hover:bg-card-hover",
        ghost: "bg-transparent text-text-2 hover:text-text hover:bg-card",
        outline: "bg-transparent text-text border border-text hover:bg-text hover:text-ground skew",
        danger: "bg-red text-white hover:bg-red-hover",
        link: "bg-transparent text-gold hover:text-gold-hover normal-case tracking-normal font-sans font-semibold p-0 h-auto",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-13 px-7 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const skewed = variant === "primary" || variant === "outline" || variant === undefined;
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props}>
      {skewed && !asChild ? <span className="inline-flex items-center gap-2">{children}</span> : children}
    </Comp>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
