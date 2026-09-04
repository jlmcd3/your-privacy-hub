/**
 * Framed product screenshot: a slightly raised mat around the image with a
 * soft bezel highlight, used on /explore and /research to present real
 * product screenshots consistently.
 */
export default function ShotFrame({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-brand-cloud bg-gradient-to-b from-white to-brand-cloud/60 p-2 shadow-eup-md">
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl shadow-[inset_0_1px_4px_rgba(13,31,53,0.18)]">
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </div>
    </div>
  );
}
