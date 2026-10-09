import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({
  className,
  checked,
  onCheckedChange,
  disabled,
  ...props
}: {
  className?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
} & React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "peer group relative inline-flex h-6 w-11 shrink-0 cursor-pointer appearance-none items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5A940] disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#3AAD7A]" : "bg-neutral-300 dark:bg-neutral-700",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
