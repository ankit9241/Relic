import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const actionVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-cobalt text-primary-foreground hover:bg-ink rounded-sm",
        ink: "bg-ink text-on-ink hover:bg-cobalt rounded-sm",
        outline:
          "border border-foreground/80 text-foreground hover:bg-foreground hover:text-background rounded-sm",
        link: "text-foreground underline decoration-border underline-offset-[6px] hover:decoration-cobalt hover:text-cobalt",
        onInk: "border border-on-ink/60 text-on-ink hover:bg-on-ink hover:text-ink rounded-sm",
        ghost: "text-muted-foreground hover:text-foreground",
      },
      size: { sm: "h-8 px-3 text-[13px]", md: "h-11 px-5", lg: "h-12 px-6", none: "" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ActionVariants = VariantProps<typeof actionVariants>;

export function Action({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ActionVariants) {
  return <button className={cn(actionVariants({ variant, size }), className)} {...props} />;
}
