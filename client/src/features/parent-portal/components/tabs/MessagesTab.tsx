import { SpinnerGap, Envelope, EnvelopeOpen } from '@phosphor-icons/react';
import { SectionCard, EmptyState } from '../shared';
import { parentPortalApi } from '../../api/parentPortalApi';
import type { PortalMessage } from '../../../student-portal/api/portalApi';
import { useGuardianResource } from '../../hooks/useGuardianResource';

const senderName = (m: PortalMessage) => {
  const s = m.sender_id;
  if (!s) return 'Unknown sender';
  return `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || s.email || 'Unknown sender';
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function MessagesTab() {
  const { data, loading, error } = useGuardianResource(parentPortalApi.getMessages);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-green-600" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-red-500 text-sm">{error}</div>;
  }

  const messages: PortalMessage[] = data?.messages ?? [];

  return (
    <SectionCard title="Inbox" subtitle={data?.unread ? `${data.unread} unread` : 'No unread messages'}>
      {messages.length === 0 ? (
        <EmptyState text="Your Tray is empty." />
      ) : (
        <div className="space-y-2">
          {messages.map((m) => {
            const Icon = m.is_read ? EnvelopeOpen : Envelope;
            return (
              <div key={m._id} className={`flex items-start gap-3 rounded-xl border p-4 ${m.is_read ? 'border-gray-100 bg-white' : 'border-green-100 bg-green-50/50'}`}>
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${m.is_read ? 'font-medium text-gray-800' : 'font-semibold text-gray-900'}`}>
                      {m.subject || '(no subject)'}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(m.createDate)}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-0.5">{senderName(m)}</p>
                  {m.message && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.message}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
