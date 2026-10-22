import { SpinnerGap, Bell, Megaphone, CurrencyDollar, ClipboardText, Trophy, Info } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { portalApi, type PortalNotification } from '../../api/portalApi';
import { usePortalResource } from '../../hooks/usePortalResource';

const ICONS: Record<string, React.ElementType> = {
  notice: Megaphone,
  message: Bell,
  system: Info,
  fee: CurrencyDollar,
  attendance: ClipboardText,
  result: Trophy,
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function NotificationsTab() {
  const { data, loading, error } = usePortalResource(portalApi.getNotifications);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  const notifications: PortalNotification[] = data?.notifications ?? [];

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Notifications</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          {data?.unread ? `${data.unread} unread` : 'All caught up'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <Bell size={28} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground/80">You have no notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <div
                  key={n._id}
                  className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                    n.is_read
                      ? 'border-border/60 bg-card hover:bg-muted/30'
                      : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
