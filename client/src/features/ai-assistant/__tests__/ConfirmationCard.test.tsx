import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmationCard from '../components/ConfirmationCard';
import type { ChatTurn } from '../types/ai.types';

type Confirmation = NonNullable<ChatTurn['confirmation']>;

const confirmation = (overrides: Partial<Confirmation> = {}): Confirmation => ({
  actionId: 'action-1',
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  state: 'awaiting',
  preview: {
    title: 'Publish "Term 2 fee deadline"',
    summary: 'This will publish announcement NOT-0004 and notify each recipient.',
    impact: 'Notify 412 people',
    details: { recipients: 412, targetRole: 'all', noticeNo: 'NOT-0004' },
  },
  ...overrides,
});

describe('ConfirmationCard', () => {
  it('states the consequence before anything happens', () => {
    render(<ConfirmationCard confirmation={confirmation()} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('Publish "Term 2 fee deadline"')).toBeInTheDocument();
    expect(screen.getByText('Notify 412 people')).toBeInTheDocument();
    expect(screen.getByText('412')).toBeInTheDocument();
  });

  it('offers an explicit choice rather than proceeding', () => {
    render(<ConfirmationCard confirmation={confirmation()} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('only fires onConfirm when the user actually clicks confirm', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmationCard confirmation={confirmation()} onConfirm={onConfirm} onCancel={vi.fn()} />);

    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel on cancel', async () => {
    const onCancel = vi.fn();
    render(<ConfirmationCard confirmation={confirmation()} onConfirm={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables both controls while the action is in flight, preventing double submission', () => {
    render(
      <ConfirmationCard
        confirmation={confirmation({ state: 'confirming' })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /working/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('says plainly that nothing changed when cancelled', () => {
    render(
      <ConfirmationCard
        confirmation={confirmation({ state: 'cancelled' })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/nothing was changed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });

  it('stops offering confirmation once the action has run', () => {
    render(
      <ConfirmationCard
        confirmation={confirmation({ state: 'confirmed' })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Done.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });
});
