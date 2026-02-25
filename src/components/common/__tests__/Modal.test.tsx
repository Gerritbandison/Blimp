import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal body content</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  // ── 1. Renders nothing when open=false ───────────────────────────────────

  it('renders nothing when open is false', () => {
    const { container } = render(
      <Modal {...defaultProps} open={false}>
        <p>Hidden content</p>
      </Modal>
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  // ── 2. Renders content when open=true ────────────────────────────────────

  it('renders content when open is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });

  // ── 3. Shows title ──────────────────────────────────────────────────────

  it('shows the title', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal attributes', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('title is linked to dialog via aria-labelledby', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();

    const titleElement = document.getElementById(labelledBy!);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Test Modal');
  });

  // ── 4. Close button calls onClose ────────────────────────────────────────

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── 5. Backdrop click calls onClose ──────────────────────────────────────

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    // The backdrop has aria-hidden="true"
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── 6. Escape key calls onClose ──────────────────────────────────────────

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('non-Escape keys do not call onClose', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(onClose).not.toHaveBeenCalled();
  });

  // ── 7. Renders footer when provided ──────────────────────────────────────

  it('renders footer when provided', () => {
    render(
      <Modal {...defaultProps} footer={<button>Save</button>}>
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not render footer section when not provided', () => {
    render(
      <Modal {...defaultProps} footer={undefined}>
        <p>Body</p>
      </Modal>
    );

    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  // ── 8. Locks body scroll ─────────────────────────────────────────────────

  it('locks body scroll when open', () => {
    render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(<Modal {...defaultProps} open={true} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal {...defaultProps} open={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('restores body scroll on unmount', () => {
    const { unmount } = render(<Modal {...defaultProps} open={true} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
