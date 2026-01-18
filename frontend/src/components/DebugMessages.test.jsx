import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DebugMessages from './DebugMessages';

describe('DebugMessages Component', () => {
  it('renders "No messages found" when the list is empty', () => {
    render(<DebugMessages messages={[]} />);
    expect(screen.getByText(/No messages found/i)).toBeInTheDocument();
  });

  it('renders a list of messages when provided', () => {
    const mockMessages = ['Message 1', 'Message 2'];
    render(<DebugMessages messages={mockMessages} />);
    
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
  });
});