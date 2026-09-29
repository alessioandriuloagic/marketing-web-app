import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SuggestionCards } from '@/components/SuggestionCards';

describe('SuggestionCards', () => {
  it('shows the four Italian suggested questions', () => {
    render(<SuggestionCards disabled={false} onPick={() => {}} />);

    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(
      screen.getByText('Qual è il tasso di clic complessivo delle campagne email?')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Quante interazioni totali di marketing sono state registrate?')
    ).toBeInTheDocument();
  });

  it('sends the full question when a card is picked', () => {
    const onPick = vi.fn();
    render(<SuggestionCards disabled={false} onPick={onPick} />);

    fireEvent.click(
      screen.getByText('Quante aperture uniche totali ci sono state su tutte le email?')
    );

    expect(onPick).toHaveBeenCalledWith(
      'Quante aperture uniche totali ci sono state su tutte le email?'
    );
  });

  it('disables the cards while a question is being answered', () => {
    render(<SuggestionCards disabled onPick={() => {}} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});
