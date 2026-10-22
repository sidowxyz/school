import { SpinnerGap, Envelope, EnvelopeOpen } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { portalApi, type PortalMessage } from '../../api/portalApi';
import { usePortalResource } from '../../hooks/usePortalResource';

const senderName = (m: PortalMessage) => {
  const s = m.sender_id;
  if (!s) return 'Unknown sender';
  return `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || s.email || 'Unknown sender';
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function MessagesTab() {
  const { data, loading, error } = usePortalResource(portalApi.getMessages);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  const messages: PortalMessage[] = data?.messages ?? [];

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Inbox</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          {data?.unread ? `${data.unread} unread` : 'No unread messages'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <Envelope size={28} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">Inbox empty</p>
            <p className="text-xs text-muted-foreground/80">Your Tray is empty.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((m) => {
              const Icon = m.is_read ? EnvelopeOpen : Envelope;
              return (
                <div
                  key={m._id}
                  className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                    m.is_read
                      ? 'border-border/60 bg-card hover:bg-muted/30'
                      : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${m.is_read ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>
                        {m.subject || '(no subject)'}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(m.createDate)}</span>
                    </div>
                    <p className="text-xs text-primary mt-0.5">{senderName(m)}</p>
                    {m.message && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.message}</p>}
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
