type Tab = {
  id: string;
  label: string;
};

export function Tabs({ tabs, activeId, onChange }: { tabs: Tab[]; activeId: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`rounded-lg px-3 py-3 text-base font-bold ${activeId === tab.id ? "bg-court text-white" : "border border-line bg-white text-ink"}`}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
