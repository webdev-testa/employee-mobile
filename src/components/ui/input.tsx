import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[14px] border border-[#C8E8F5] bg-white px-3.5 py-2 text-sm text-[#1A3A4A] placeholder:text-[#8ABAC8] transition-colors outline-none focus-visible:border-[#8ABAC8] focus-visible:ring-1 focus-visible:ring-[#8ABAC8] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
