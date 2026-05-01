import { useParams } from "react-router-dom";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";

export default function USNoticeRefresh() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <USNoticeShell
      title="Refresh Your Notices — US Notice Builder"
      heading="Annual refresh"
    >
      <p className="text-muted-foreground text-sm">Session: {sessionId}</p>
    </USNoticeShell>
  );
}
