import { useParams } from "react-router-dom";
import { RopaShell } from "@/components/ropa/RopaShell";

export default function RopaRefresh() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <RopaShell
      title="Annual Refresh — RoPA Builder"
      heading={
        sessionId ? `Annual Refresh — Session ${sessionId}` : "Annual Refresh"
      }
    />
  );
}
