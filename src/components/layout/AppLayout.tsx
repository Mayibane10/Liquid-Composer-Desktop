import { TopToolbar } from './TopToolbar';
import { LeftPanel } from './LeftPanel';
import { IconCanvas } from '../canvas/IconCanvas';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { useFileDrop } from '../useFileDrop';

export function AppLayout() {
  useFileDrop();
  return (
    <div className="editor-app flex flex-col h-screen text-[#ebebf5] font-system overflow-hidden">
      <TopToolbar />
      <main className="editor-workspace flex flex-1 min-h-0 overflow-hidden">
        <LeftPanel />
        <IconCanvas />
        <InspectorPanel />
      </main>
    </div>
  );
}
