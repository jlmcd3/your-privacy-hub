import { RopaShell } from "@/components/ropa/RopaShell";

export default function RopaLanding() {
  return (
    <RopaShell
      title="RoPA Builder — Records of Processing Activities | End User Privacy"
      heading="RoPA Builder"
    >
      <p className="text-muted-foreground max-w-2xl">
        Document your processing activities and generate a defensible Record
        of Processing Activities (RoPA) ready for regulator scrutiny.
      </p>
    </RopaShell>
  );
}
