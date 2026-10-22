import { useEffect, useMemo, useState } from 'react';
import { Envelope, Chat, Bell, PaperPlaneRight, Users, Plus, SpinnerGap, Trash, Megaphone, Radio } from '@phosphor-icons/react';
import { communicationApi, type InboxMessage, type SentMessage, type Notice, type CommUser } from '../api/communicationApi';
import { usersApi } from '../../users/api/usersApi';
import type { AppUser } from '../../users/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Tab = 'messages' | 'announcements' | 'sms';

const CATEGORY_COLORS: Record<string, string> = {
  Event: 'bg-purple-100 text-purple-700',
  Academic: 'bg-blue-100 text-blue-700',
  Holiday: 'bg-green-100 text-green-700',
  Urgent: 'bg-red-100 text-red-700',
  General: 'bg-gray-100 text-gray-700',
};

const CATEGORIES = ['General', 'Academic', 'Event', 'Holiday', 'Urgent'];
// UI label → backend target_role (the notice targets a single role).
const AUDIENCES: { label: string; role: string }[] = [
  { label: 'Everyone', role: 'all' },
  { label: 'Students', role: 'student' },
  { label: 'Parents', role: 'parent' },
  { label: 'Teachers', role: 'teacher' },
];

const userLabel = (u?: CommUser | AppUser | null) => {
  if (!u) return 'Unknown';
  const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return name || u.email || 'Unknown';
};

const audienceLabel = (role: string) => AUDIENCES.find((a) => a.role === role)?.label ?? role;

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

// Compose Message Modal
function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usersApi.getAll({ limit: 500 }).then((r) => setUsers(r.users)).catch(() => {});
  }, []);

  const canSend = receiverId && subject.trim().length >= 2 && message.trim().length > 0;

  async function submit() {
    if (!canSend) return;
    setSaving(true);
    setError('');
    try {
      await communicationApi.sendMessage({ receiver_id: receiverId, subject: subject.trim(), message: message.trim() });
      onSent();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to PaperPlaneRight message.');
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compose New Message</DialogTitle>
          <DialogDescription>Send a direct message to a user.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1 block">To</Label>
            <NativeSelect
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="w-full"
            >
              <option value="">Select a recipient…</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{userLabel(u)} — {u.role}</option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label className="mb-1 block">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject" />
          </div>
          <div>
            <Label className="mb-1 block">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message here..." rows={5} className="resize-none" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!canSend || saving} className="flex items-center gap-2">
            {saving ? <SpinnerGap size={14} className="animate-spin" /> : <PaperPlaneRight size={14} />} {saving ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Announcement Modal
function CreateAnnouncementModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [targetRole, setTargetRole] = useState('all');
  const [content, setContent] = useState('');
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canPost = title.trim().length >= 3 && content.trim().length >= 10;

  async function submit() {
    if (!canPost) return;
    setSaving(true);
    setError('');
    try {
      const res = await communicationApi.createNotice({ title: title.trim(), content: content.trim(), category, target_role: targetRole });
      if (publish) {
        const id = res.data?.data?._id;
        if (id) await communicationApi.publishNotice(id);
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create announcement.');
      setSaving(false);
    }
  }

  const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
          <DialogDescription>Post a new Buildings announcement.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Category</Label>
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label className="mb-1 block">Audience</Label>
              <NativeSelect value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full">
                {AUDIENCES.map((a) => <option key={a.role} value={a.role}>{a.label}</option>)}
              </NativeSelect>
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Announcement content..." rows={4} className="resize-none" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={publish} onCheckedChange={(v) => setPublish(v === true)} />
            <span className="text-sm text-foreground">Publish immediately <span className="text-muted-foreground">(otherwise saved as draft)</span></span>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!canPost || saving} className="flex items-center gap-2">
            {saving ? <SpinnerGap size={14} className="animate-spin" /> : <Bell size={14} />} {saving ? 'Saving…' : 'Post Announcement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Page
export default function CommunicationPage() {
  const [tab, setTab] = useState<Tab>('messages');
  const [showCompose, setShowCompose] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [inboxRes, sentRes, noticesRes] = await Promise.all([
        communicationApi.getInbox(),
        communicationApi.getSent(),
        communicationApi.getNotices(),
      ]);
      setInbox(inboxRes); setSent(sentRes); setNotices(noticesRes); setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load communication data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const unread = inbox.Funnel((m) => !m.is_read).length;
  const publishedCount = notices.Funnel((n) => n.is_published).length;

  const messageItems = useMemo(() => {
    const items = [
      ...inbox.map((m) => ({ id: m._id, dir: 'in' as const, who: userLabel(m.sender_id), subject: m.subject, text: m.message, date: m.createDate, unread: !m.is_read })),
      ...sent.map((m) => ({ id: m._id, dir: 'out' as const, who: userLabel(m.receiver_id), subject: m.subject, text: m.message, date: m.createDate, unread: false })),
    ];
    return items.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  }, [inbox, sent]);

  async function publish(id: string) {
    await communicationApi.publishNotice(id);
    loadAll();
  }
  async function removeNotice(id: string) {
    if (!window.confirm('Delete this announcement?')) return;
    await communicationApi.deleteNotice(id);
    loadAll();
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
        <p className="text-sm text-gray-500 mt-1">Manage messages, announcements, and notifications</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Unread Messages" value={String(unread)} sub="Requires attention" icon={<Envelope size={20} className="text-blue-500" />} />
        <StatCard label="Total Messages" value={String(inbox.length + sent.length)} sub="Inbox + sent" icon={<Chat size={20} className="text-green-500" />} />
        <StatCard label="Published Notices" value={String(publishedCount)} sub={`${notices.length} total`} icon={<Bell size={20} className="text-purple-500" />} />
        <StatCard label="SMS" value="—" sub="Gateway not configured" icon={<PaperPlaneRight size={20} className="text-orange-400" />} />
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['messages', 'announcements', 'sms'] as Tab[]).map((t) => (
            <Button variant="plain" key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-50 text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'sms' ? 'SMS' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-green-600" /></div>
        ) : (
          <>
            {/* Messages */}
            {tab === 'messages' && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Messages</h2>
                    <p className="text-sm text-gray-400">Internal messaging system</p>
                  </div>
                  <Button variant="plain" onClick={() => setShowCompose(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                    <PaperPlaneRight size={15} /> Compose Message
                  </Button>
                </div>

                {messageItems.length === 0 ? (
                  <div className="py-14 text-center text-gray-400 text-sm">No messages yet.</div>
                ) : (
                  <div className="space-y-3">
                    {messageItems.map((msg) => (
                      <div key={`${msg.dir}-${msg.id}`} className={`rounded-xl p-4 border border-gray-100 ${msg.unread ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {msg.dir === 'in' ? `From: ${msg.who}` : `To: ${msg.who}`}
                            </span>
                            {msg.unread && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">New</span>}
                          </div>
                          {msg.dir === 'out' && <span className="text-xs border border-green-400 text-green-600 px-2 py-0.5 rounded-full font-medium shrink-0">Sent</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 mb-2">{formatDate(msg.date)}</p>
                        <p className="text-sm font-bold text-gray-900 mb-1">{msg.subject}</p>
                        <p className="text-sm text-gray-600">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Announcements */}
            {tab === 'announcements' && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Announcements</h2>
                    <p className="text-sm text-gray-400">School-wide notices and updates</p>
                  </div>
                  <Button variant="plain" onClick={() => setShowAnnouncement(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                    <Plus size={15} /> Create Announcement
                  </Button>
                </div>

                {notices.length === 0 ? (
                  <div className="py-14 text-center text-gray-400 text-sm">No announcements yet.</div>
                ) : (
                  <div className="space-y-3">
                    {notices.map((n) => (
                      <div key={n._id} className="border border-gray-100 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[n.category ?? 'General'] ?? 'bg-gray-100 text-gray-700'}`}>
                              {n.category ?? 'General'}
                            </span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${n.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {n.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{formatDate(n.createDate)}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">{n.title}</p>
                        <p className="text-sm text-gray-600 mb-3">{n.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Users size={13} />
                            <span>{audienceLabel(n.target_role)}</span>
                            <span className="mx-1">·</span>
                            <span>Posted by: {userLabel(n.createBy)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!n.is_published && (
                              <Button variant="plain" onClick={() => publish(n._id)} className="text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition-colors flex items-center gap-1">
                                <Megaphone size={13} /> Publish
                              </Button>
                            )}
                            <Button variant="plain" onClick={() => removeNotice(n._id)} className="text-gray-400 hover:text-red-500 p-1.5" title="Delete">
                              <Trash size={15} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SMS — no backend gateway */}
            {tab === 'sms' && (
              <div className="p-5">
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <Radio size={26} className="text-gray-300" />
                  </div>
                  <p className="mt-4 font-semibold text-gray-700">SMS is not available yet</p>
                  <p className="mt-1 text-sm text-gray-400 max-w-sm">
                    No SMS gateway is configured on the server. Once one is connected, bulk SMS to
                    students, parents, and teachers will appear here.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onSent={loadAll} />}
      {showAnnouncement && <CreateAnnouncementModal onClose={() => setShowAnnouncement(false)} onCreated={loadAll} />}
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
