import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";
import { EcoPanel } from "@/components/ui/eco";

export default function SystemApp({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <XpWindow title={title}>
      <div className="stack">
        <EcoPanel>
          <div className="panel-title">{title}</div>
          <p className="muted">{message}</p>
        </EcoPanel>
      </div>
    </XpWindow>
  );
}
