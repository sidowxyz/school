interface Tab<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}

import { Tabs as ShadcnTabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Tabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <ShadcnTabs value={active} onValueChange={(value) => onChange(value as T)} className="w-full">
      <TabsList className="flex h-auto w-full gap-1 border border-border bg-card p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </ShadcnTabs>
  );
}
