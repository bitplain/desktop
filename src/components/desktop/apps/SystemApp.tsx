import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";

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
        <div className="eco-panel">
          <div className="panel-title">{title}</div>
          <p className="muted">{message}</p>
        </div>
      </div>
    </XpWindow>
  );
}
