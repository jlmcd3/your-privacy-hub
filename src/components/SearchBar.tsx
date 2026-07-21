import { Bot, Globe, Scale } from 'lucide-react';
const QUICK_LINKS = [
  { label: "🇪🇺 GDPR",         href: "/jurisdiction/european-union" },
  { label: "🇺🇸 US Privacy Laws", href: "/us-privacy-laws"       },
  { label: " AI Act",         href: "/topics/ai-governance"         },
  { label: " Enforcement",    href: "/enforcement-tracker"          },
  { label: " Global Laws",    href: "/global-privacy-laws"          },
  { label: "Enforcement fines", href: "/category/enforcement"         },
  { label: "Data transfers",    href: "/topics/data-transfers"        },
  { label: "Children's privacy",href: "/topics/children-privacy"      },
];

const SearchBar = () => {
  return (
    <div className="py-4 md:py-5 px-4 md:px-8 bg-card border-b border-brand-cloud">
      <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1.5 items-center flex-wrap">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[12px] font-medium text-slate bg-brand-cloud px-2.5 py-1 rounded-full border border-brand-cloud cursor-pointer hover:bg-brand-navy hover:text-white transition-all whitespace-nowrap no-underline"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
