import { Link } from "react-router-dom";
import { getRegulator } from "@/lib/regulators";

interface RegulatorLinkProps {
  slug: string;
  full?: boolean;
}

const warned = new Set<string>();

/**
 * Single canonical way to mention a regulator in Research JSX content.
 * `full=true`  → "Full Authority Name (ABBR)"
 * `full=false` → "ABBR" (default — for subsequent mentions in a page)
 *
 * For pages whose content is HTML strings, normalize the existing
 * <a href="/regulator/{slug}"> mentions manually using the same pattern.
 */
export function RegulatorLink({ slug, full = false }: RegulatorLinkProps) {
  const reg = getRegulator(slug);
  if (!reg) {
    if (!warned.has(slug)) {
      warned.add(slug);
      // eslint-disable-next-line no-console
      console.warn(`[RegulatorLink] Unknown regulator slug: "${slug}"`);
    }
    return <span>{slug.toUpperCase()}</span>;
  }

  const label =
    full && reg.abbreviation && reg.abbreviation !== reg.name
      ? `${reg.name} (${reg.abbreviation})`
      : reg.abbreviation || reg.name;

  return (
    <Link
      to={`/regulator/${slug}`}
      className="text-brand-teal no-underline hover:underline"
    >
      {label}
    </Link>
  );
}

export default RegulatorLink;
