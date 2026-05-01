import { useParams } from "react-router-dom";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";

export default function USNoticeReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <USNoticeShell
      title="Review Your Notices — End User Privacy"
      heading="Review your notices"
    >
      <p className="text-muted-foreground text-sm">Session: {sessionId}</p>
    </USNoticeShell>
  );
}
