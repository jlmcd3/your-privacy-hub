import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  value: string | undefined;
  setValue: (value: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, value, defaultValue, onValueChange, ...props }, ref) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const currentValue = isControlled ? value : internalValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const ctx = React.useMemo<RadioGroupContextValue>(
    () => ({ value: currentValue, setValue }),
    [currentValue, setValue],
  );

  return (
    <RadioGroupContext.Provider value={ctx}>
      <RadioGroupPrimitive.Root
        className={cn("grid gap-2", className)}
        {...props}
        value={currentValue ?? ""}
        onValueChange={setValue}
        ref={ref}
      />
    </RadioGroupContext.Provider>
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, onClick, value, ...props }, ref) => {
  const ctx = React.useContext(RadioGroupContext);
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (ctx && ctx.value === value) {
          // Defer to allow Radix's own click handler to run first, then clear.
          requestAnimationFrame(() => ctx.setValue(""));
        }
      }}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
