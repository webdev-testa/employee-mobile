import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[14px] border p-4.5 [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4.5 [&>svg]:top-4.5 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-white border-[#C8E8F5] text-[#1A3A4A] [&>svg]:text-[#4A7A8A]",
        destructive: "bg-[#F87171]/10 border-[#F87171]/30 text-[#F87171] [&>svg]:text-[#F87171]",
        warning: "bg-[#F5A940]/10 border-[#F5A940]/30 text-[#4A7A8A] [&>svg]:text-[#F5A940]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-['Syne'] font-bold text-[14px] leading-none tracking-tight text-[#1A3A4A]", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[12px] leading-normal text-[#4A7A8A] [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
