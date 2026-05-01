import { useParams } from "react-router-dom";
import { RopaShell } from "@/components/ropa/RopaShell";

export default function RopaActivity() {
  const { id } = useParams<{ id: string }>();
  return (
    <RopaShell
      title="Activity — RoPA Builder"
      heading={id ? `Activity ${id} — RoPA Builder` : "Activity — RoPA Builder"}
    />
  );
}
