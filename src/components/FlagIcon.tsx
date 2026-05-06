import { ReactNode } from "react";

/**
 * Renders an inline EU flag SVG when the icon string contains the EU
 * regional-indicator emoji (🇪🇺), which Windows browsers render as plain
 * "EU" text. Other emoji/strings pass through unchanged.
 *
 * Usage:
 *   <FlagIcon icon={item.icon} />          // replace {item.icon}
 *   <FlagIcon icon="🇪🇺 EU & UK" />        // mixed strings work too
 */
const EU_EMOJI = "\uD83C\uDDEA\uD83C\uDDFA"; // 🇪🇺

export function FlagIcon({
  icon,
  className = "",
  size = "1em",
}: {
  icon?: string | null;
  className?: string;
  size?: string | number;
}): ReactNode {
  if (!icon) return null;

  if (!icon.includes(EU_EMOJI)) return icon;

  const flag = (
    <img
      key="eu-flag"
      src="/eu-flag.svg"
      alt="EU"
      className={`inline-block align-[-0.125em] ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );

  // If the icon is just the EU emoji, return the flag directly.
  if (icon === EU_EMOJI) return flag;

  // Otherwise splice the flag into the surrounding text.
  const parts = icon.split(EU_EMOJI);
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i > 0) out.push(<span key={`f${i}`}>{flag}</span>);
    if (part) out.push(<span key={`t${i}`}>{part}</span>);
  });
  return <>{out}</>;
}
