import { useParams } from "react-router-dom";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";

export default function USNoticeStates() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <USNoticeShell
      title="Select States — US Notice Builder"
      heading="Select states"
    >
      <p className="text-muted-foreground text-sm">Session: {sessionId}</p>
    </USNoticeShell>
  );
}
