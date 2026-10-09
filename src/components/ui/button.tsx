import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-[#F5A940]/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#F5A940] hover:bg-[#e09833] text-white shadow-[#F5A940]/20 shadow-lg border-none",
        orange: "bg-[#F5A940] hover:bg-[#e09833] text-white shadow-[#F5A940]/20 shadow-lg border-none",
        green: "bg-[#3AAD7A] hover:bg-[#2b8a60] text-white shadow-[#3AAD7A]/20 shadow-lg border-none",
        red: "bg-[#C84B2F] hover:bg-[#b03d24] text-white shadow-[#C84B2F]/20 shadow-lg border-none",
        secondary: "bg-[#F0FAFF]/45 border border-[#C8E8F5] text-[#4A7A8A] hover:bg-[#F0FAFF]",
        outline: "border border-[#C8E8F5] text-[#4A7A8A] bg-white hover:bg-[#F0FAFF] shadow-sm",
        ghost: "hover:bg-[#F0FAFF] text-[#4A7A8A] border-none",
        destructive: "border border-[#F87171]/30 text-[#F87171] bg-white hover:bg-[#F87171]/5",
        link: "text-[#4A7A8A] underline-offset-4 hover:underline border-none bg-transparent",
      },
      size: {
        default: "py-3 px-5 text-sm rounded-[14px]",
        sm: "py-2 px-3.5 text-xs rounded-[12px]",
        lg: "py-3.5 px-6 text-base font-bold rounded-[14px]",
        xl: "py-4 px-6 text-[17px] font-bold rounded-[16px]",
        icon: "w-10 h-10 flex items-center justify-center rounded-xl",
        "icon-lg": "w-[42px] h-[42px] flex items-center justify-center rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
