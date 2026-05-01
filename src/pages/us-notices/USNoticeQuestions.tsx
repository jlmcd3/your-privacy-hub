import { useParams } from "react-router-dom";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";

export default function USNoticeQuestions() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <USNoticeShell
      title="Questions — US Notice Builder"
      heading="Questions"
    >
      <p className="text-muted-foreground text-sm">Session: {sessionId}</p>
    </USNoticeShell>
  );
}
