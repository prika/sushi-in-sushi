/**
 * Component Tests: ReservationForm
 * Tests for the real reservation form component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../helpers/test-utils';
import React from 'react';
import { useTranslations } from 'next-intl';
import { ReservationForm } from '@/components/ReservationForm';

// Portuguese translations for namespaces used by ReservationForm
const translations: Record<string, Record<string, string>> = {
  reservationForm: {
    firstName: 'Primeiro Nome',
    lastName: 'Apelido',
    email: 'Email',
    phone: 'Telefone',
    date: 'Data',
    time: 'Hora',
    selectTime: 'Selecione a hora',
    noTimesAvailable: 'Sem horários disponíveis',
    noTimesToday: 'Não há mais horários disponíveis para hoje',
    partySize: 'Número de Pessoas',
    decreaseParty: 'Diminuir número de pessoas',
    increaseParty: 'Aumentar número de pessoas',
    restaurant: 'Restaurante',
    serviceType: 'Tipo de Serviço',
    rodizio: 'Rodízio',
    alaCarte: 'À Carta',
    occasion: 'Ocasião',
    specialRequests: 'Pedidos Especiais / Alergias',
    specialRequestsPlaceholder: 'Informe-nos de alergias ou pedidos especiais...',
    marketingConsent: 'Aceito receber novidades e promoções por email',
    submit: 'Confirmar Reserva',
    submitting: 'A processar...',
    confirmationNote: 'A sua reserva será confirmada por telefone ou email.',
    successTitle: 'Reserva Recebida!',
    successMessage: 'Entraremos em contacto para confirmar a sua reserva.',
    newReservation: 'Fazer Nova Reserva',
    errorDefault: 'Erro ao criar reserva',
    closureWarning: 'Por favor escolha outra data.',
    required: '*',
  },
  reservation: {
    selectOptional: 'Selecione (opcional)',
    birthday: 'Aniversário',
    celebration: 'Celebração',
    business: 'Negócios',
    other: 'Outro',
  },
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to get a future date string (YYYY-MM-DD)
function getFutureDate(daysAhead: number = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

// Helper to fill all required form fields
function fillRequiredFields() {
  // Fill text inputs
  fireEvent.change(screen.getByPlaceholderText('João'), { target: { value: 'Maria' } });
  fireEvent.change(screen.getByPlaceholderText('Silva'), { target: { value: 'Santos' } });
  fireEvent.change(screen.getByPlaceholderText('joao@email.com'), { target: { value: 'maria@test.com' } });
  fireEvent.change(screen.getByPlaceholderText('+351 912 345 678'), { target: { value: '912345678' } });

  // Fill date (use a date 5 days in future to ensure all time slots are available)
  const dateInputs = document.querySelectorAll('input[type="date"]');
  fireEvent.change(dateInputs[0], { target: { value: getFutureDate(5) } });

  // Fill time - find the select with time options
  const timeSelects = screen.getAllByRole('combobox');
  const hourSelect = timeSelects.find(s => s.querySelector('option[value="19:00"]'));
  if (hourSelect) {
    fireEvent.change(hourSelect, { target: { value: '19:00' } });
  }
}

describe('ReservationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Override global next-intl mock with real Portuguese translations
    vi.mocked(useTranslations).mockImplementation(
      (namespace: string) => ((key: string) => translations[namespace]?.[key] ?? key) as any
    );

    // Default mock for closure check - not closed
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/closures/check')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isClosed: false }),
        });
      }
      // Default response for other endpoints
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'test-id' }),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Renderização', () => {
    it('renderiza todos os campos obrigatórios', () => {
      render(<ReservationForm />);

      // Check for labels (the real component uses labels)
      expect(screen.getByText('Primeiro Nome *')).toBeInTheDocument();
      expect(screen.getByText('Apelido *')).toBeInTheDocument();
      expect(screen.getByText('Email *')).toBeInTheDocument();
      expect(screen.getByText('Telefone *')).toBeInTheDocument();
      expect(screen.getByText('Data *')).toBeInTheDocument();
      expect(screen.getByText('Hora *')).toBeInTheDocument();
    });

    it('renderiza seletor de localização com opções corretas', () => {
      render(<ReservationForm />);

      expect(screen.getByText('Restaurante *')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Circunvalação' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Boavista' })).toBeInTheDocument();
    });

    it('renderiza botões de tipo de serviço (Rodízio/À Carta)', () => {
      render(<ReservationForm />);

      expect(screen.getByRole('button', { name: 'Rodízio' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'À Carta' })).toBeInTheDocument();
    });

    it('renderiza seletor de número de pessoas', () => {
      render(<ReservationForm />);

      expect(screen.getByText('Número de Pessoas *')).toBeInTheDocument();
      // Default value is 2
      expect(screen.getByText('2')).toBeInTheDocument();
      // +/- buttons (using aria-labels)
      expect(screen.getByRole('button', { name: 'Diminuir número de pessoas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aumentar número de pessoas' })).toBeInTheDocument();
    });

    it('renderiza campo de ocasião', () => {
      render(<ReservationForm />);

      expect(screen.getByText('Ocasião')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Selecione (opcional)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Aniversário' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Celebração' })).toBeInTheDocument();
    });

    it('renderiza campo de pedidos especiais', () => {
      render(<ReservationForm />);

      expect(screen.getByText('Pedidos Especiais / Alergias')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Informe-nos de alergias ou pedidos especiais...')).toBeInTheDocument();
    });

    it('renderiza checkbox de marketing consent', () => {
      render(<ReservationForm />);

      expect(screen.getByLabelText('Aceito receber novidades e promoções por email')).toBeInTheDocument();
    });

    it('renderiza botão de submit', () => {
      render(<ReservationForm />);

      expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeInTheDocument();
    });

    it('usa localização padrão quando fornecida', () => {
      render(<ReservationForm defaultLocation="boavista" />);

      // Find the location select by looking for the one with Circunvalação/Boavista options
      const selects = screen.getAllByRole('combobox');
      const locationSelect = selects.find(select =>
        select.querySelector('option[value="circunvalacao"]')
      )!;

      expect(locationSelect).toHaveValue('boavista');
    });
  });

  describe('Interações - Party Size', () => {
    it('incrementa número de pessoas ao clicar +', () => {
      render(<ReservationForm />);

      const plusButton = screen.getByRole('button', { name: 'Aumentar número de pessoas' });
      fireEvent.click(plusButton);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('decrementa número de pessoas ao clicar -', () => {
      render(<ReservationForm />);

      const minusButton = screen.getByRole('button', { name: 'Diminuir número de pessoas' });
      fireEvent.click(minusButton);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('não permite menos de 1 pessoa', () => {
      render(<ReservationForm />);

      const minusButton = screen.getByRole('button', { name: 'Diminuir número de pessoas' });

      // Click twice (from 2 -> 1 -> still 1)
      fireEvent.click(minusButton);
      fireEvent.click(minusButton);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('não permite mais de 20 pessoas', () => {
      render(<ReservationForm />);

      const plusButton = screen.getByRole('button', { name: 'Aumentar número de pessoas' });

      // Click many times
      for (let i = 0; i < 25; i++) {
        fireEvent.click(plusButton);
      }

      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('Interações - Tipo de Serviço', () => {
    it('Rodízio está selecionado por defeito', () => {
      render(<ReservationForm />);

      const rodizioButton = screen.getByRole('button', { name: 'Rodízio' });
      // The selected button has bg-gold class
      expect(rodizioButton.className).toContain('bg-gold');
    });

    it('alterna para À Carta quando clicado', () => {
      render(<ReservationForm />);

      const aCartaButton = screen.getByRole('button', { name: 'À Carta' });
      fireEvent.click(aCartaButton);

      expect(aCartaButton.className).toContain('bg-gold');
    });
  });

  describe('Interações - Localização', () => {
    it('altera localização quando selecionada', () => {
      render(<ReservationForm />);

      const selects = screen.getAllByRole('combobox');
      // First select that contains Circunvalação option is location
      const locationSelect = selects.find(select =>
        select.querySelector('option[value="circunvalacao"]')
      )!;

      fireEvent.change(locationSelect, { target: { value: 'boavista' } });

      expect(locationSelect).toHaveValue('boavista');
    });
  });

  describe('Interações - Marketing Consent', () => {
    it('toggle marketing consent checkbox', () => {
      render(<ReservationForm />);

      const checkbox = screen.getByLabelText('Aceito receber novidades e promoções por email');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe('Verificação de Encerramento', () => {
    it('mostra aviso quando restaurante está fechado', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/closures/check')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              isClosed: true,
              reason: 'Feriado Nacional'
            }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ReservationForm />);

      // Select a date to trigger closure check
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const dateField = dateInputs[0] as HTMLInputElement;

      fireEvent.change(dateField, { target: { value: getFutureDate(1) } });

      await waitFor(() => {
        expect(screen.getByText(/Feriado Nacional/)).toBeInTheDocument();
      });
    });

    it('desabilita botão de submit quando fechado', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/closures/check')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isClosed: true }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ReservationForm />);

      const dateInputs = document.querySelectorAll('input[type="date"]');
      const dateField = dateInputs[0] as HTMLInputElement;

      fireEvent.change(dateField, { target: { value: getFutureDate(1) } });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Confirmar Reserva' });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Validação e Submissão', () => {
    it('não submete com campos vazios (HTML5 validation)', () => {
      render(<ReservationForm />);

      const submitButton = screen.getByRole('button', { name: 'Confirmar Reserva' });
      fireEvent.click(submitButton);

      // HTML5 validation prevents submission
      // The form should still be visible (not replaced by success message)
      expect(screen.getByText('Primeiro Nome *')).toBeInTheDocument();
    });

    it('envia dados para API quando formulário é válido', async () => {
      const onSuccessMock = vi.fn();
      render(<ReservationForm onSuccess={onSuccessMock} />);

      // Fill all required fields
      fillRequiredFields();

      // Wait for closure check to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/closures/check'),
        );
      });

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Confirmar Reserva' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/reservations',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('mostra mensagem de sucesso após submissão bem-sucedida', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/closures/check')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isClosed: false }),
          });
        }
        if (url === '/api/reservations') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'new-reservation-id' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ReservationForm />);

      // Fill all required fields
      fillRequiredFields();

      // Wait for closure check
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      await waitFor(() => {
        expect(screen.getByText('Reserva Recebida!')).toBeInTheDocument();
      });
    });

    it('mostra erro quando API falha', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/closures/check')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isClosed: false }),
          });
        }
        if (url === '/api/reservations') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Erro do servidor' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ReservationForm />);

      // Fill all required fields
      fillRequiredFields();

      // Wait for closure check
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      await waitFor(() => {
        expect(screen.getByText('Erro do servidor')).toBeInTheDocument();
      });
    });

    it('permite fazer nova reserva após sucesso', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/closures/check')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isClosed: false }),
          });
        }
        if (url === '/api/reservations') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'test-id' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ReservationForm />);

      // Fill all required fields
      fillRequiredFields();

      // Wait for closure check
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText('Reserva Recebida!')).toBeInTheDocument();
      });

      // Click "Fazer Nova Reserva"
      fireEvent.click(screen.getByRole('button', { name: 'Fazer Nova Reserva' }));

      // Form should be visible again
      expect(screen.getByText('Primeiro Nome *')).toBeInTheDocument();
    });
  });

  describe('Estados de Loading', () => {
    it('mostra "A processar..." durante submissão', async () => {
      // Slow response for reservations
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/closures/check')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isClosed: false }),
          });
        }
        if (url === '/api/reservations') {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ id: 'test-id' }),
              });
            }, 200);
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ReservationForm />);

      // Fill all required fields
      fillRequiredFields();

      // Wait for closure check
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'A processar...' })).toBeInTheDocument();
      });
    });

    it('desabilita botão durante submissão', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/closures/check')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isClosed: false }),
          });
        }
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ id: 'test-id' }),
            });
          }, 200);
        });
      });

      render(<ReservationForm />);

      // Fill all required fields
      fillRequiredFields();

      // Wait for closure check
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'A processar...' });
        expect(button).toBeDisabled();
      });
    });
  });
});
