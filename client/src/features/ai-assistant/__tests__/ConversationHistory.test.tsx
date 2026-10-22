import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConversationHistory from '../components/ConversationHistory';
import { aiApi } from '../api/aiApi';

vi.mock('../api/aiApi', () => ({
  aiApi: {
    conversations: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));

const mocked = aiApi as unknown as {
  conversations: ReturnType<typeof vi.fn>;
  deleteConversation: ReturnType<typeof vi.fn>;
};

const sample = [
  {
    _id: 'c1',
    title: 'which students have outstanding fees?',
    lastActivityAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    _id: 'c2',
    title: "today's school summary",
    lastActivityAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
];

describe('ConversationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.conversations.mockResolvedValue(sample);
    mocked.deleteConversation.mockResolvedValue(undefined);
  });

  it('fetches nothing until it is opened', () => {
    render(<ConversationHistory open={false} onOpenConversation={vi.fn()} />);
    expect(mocked.conversations).not.toHaveBeenCalled();
  });

  it('lists past threads with a relative time', async () => {
    render(<ConversationHistory open onOpenConversation={vi.fn()} />);

    expect(await screen.findByText('which students have outstanding fees?')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('opens the conversation that was clicked', async () => {
    const onOpen = vi.fn();
    render(<ConversationHistory open onOpenConversation={onOpen} />);

    await userEvent.click(await screen.findByText("today's school summary"));
    expect(onOpen).toHaveBeenCalledWith('c2');
  });

  it('removes a thread optimistically', async () => {
    render(<ConversationHistory open onOpenConversation={vi.fn()} />);
    await screen.findByText('which students have outstanding fees?');

    await userEvent.click(
      screen.getByRole('button', { name: /delete conversation: which students/i })
    );

    await waitFor(() =>
      expect(screen.queryByText('which students have outstanding fees?')).not.toBeInTheDocument()
    );
    expect(mocked.deleteConversation).toHaveBeenCalledWith('c1');
  });

  it('restores the row if deleting fails, rather than losing it silently', async () => {
    mocked.deleteConversation.mockRejectedValue(new Error('network'));
    render(<ConversationHistory open onOpenConversation={vi.fn()} />);
    await screen.findByText('which students have outstanding fees?');

    await userEvent.click(
      screen.getByRole('button', { name: /delete conversation: which students/i })
    );

    expect(await screen.findByText(/could not delete/i)).toBeInTheDocument();
  });

  it('explains the empty state instead of showing a blank panel', async () => {
    mocked.conversations.mockResolvedValue([]);
    render(<ConversationHistory open onOpenConversation={vi.fn()} />);

    expect(await screen.findByText(/no past conversations yet/i)).toBeInTheDocument();
  });

  it('surfaces a load failure', async () => {
    mocked.conversations.mockRejectedValue(new Error('boom'));
    render(<ConversationHistory open onOpenConversation={vi.fn()} />);

    expect(await screen.findByText(/could not load past conversations/i)).toBeInTheDocument();
  });
});
