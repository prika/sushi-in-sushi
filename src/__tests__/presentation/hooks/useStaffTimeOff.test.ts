import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStaffTimeOff } from '@/presentation/hooks/useStaffTimeOff';

// Mock global fetch
global.fetch = vi.fn();

describe('useStaffTimeOff', () => {
  let mockTimeOffs: any[];
  let mockClosures: any[];

  beforeEach(() => {
    mockTimeOffs = [
      {
        id: 1,
        staff_id: 'staff-1',
        start_date: '2024-02-01',
        end_date: '2024-02-05',
        type: 'vacation',
        reason: 'Férias',
        status: 'approved',
        staff: { id: 'staff-1', name: 'João Silva' },
      },
      {
        id: 2,
        staff_id: 'staff-2',
        start_date: '2024-02-10',
        end_date: '2024-02-12',
        type: 'sick',
        reason: 'Doença',
        status: 'approved',
        staff: { id: 'staff-2', name: 'Maria Santos' },
      },
    ];

    mockClosures = [
      {
        id: 1,
        is_recurring: true,
        recurring_day_of_week: 1, // Monday
        reason: 'Folga semanal',
      },
      {
        id: 2,
        is_recurring: false,
        date: '2024-02-15',
        reason: 'Feriado',
      },
    ];

    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString.includes('/api/staff-time-off')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTimeOffs),
        } as Response);
      }

      if (urlString.includes('/api/closures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockClosures),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      } as Response);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar ausências e folgas na montagem', async () => {
    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.timeOffs).toEqual(mockTimeOffs);
    expect(result.current.weeklyClosures).toEqual([mockClosures[0]]);
    expect(result.current.error).toBeNull();
  });

  it('deve filtrar apenas folgas semanais recorrentes', async () => {
    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.weeklyClosures).toHaveLength(1);
    expect(result.current.weeklyClosures[0].is_recurring).toBe(true);
  });

  it('deve chamar API com mês e ano corretos', async () => {
    renderHook(() => useStaffTimeOff({ month: 2, year: 2024 }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('month=3&year=2024')
      );
    });
  });

  it('deve criar nova ausência com sucesso', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: any) => {
      const urlString = url.toString();

      if (options?.method === 'POST' && urlString.includes('/api/staff-time-off')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 3 }),
        } as Response);
      }

      // Default responses for other calls
      if (urlString.includes('/api/staff-time-off')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTimeOffs),
        } as Response);
      }

      if (urlString.includes('/api/closures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockClosures),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newTimeOff = {
      staff_id: 'staff-3',
      start_date: '2024-02-20',
      end_date: '2024-02-22',
      type: 'vacation' as const,
      reason: 'Férias',
    };

    let response;
    await act(async () => {
      response = await result.current.createTimeOff(newTimeOff);
    });

    expect(response).toEqual({ success: true });
  });

  it('deve lidar com erro ao criar ausência', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: any) => {
      const urlString = url.toString();

      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Período já ocupado' }),
        } as Response);
      }

      // Default responses
      if (urlString.includes('/api/staff-time-off')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTimeOffs),
        } as Response);
      }

      if (urlString.includes('/api/closures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockClosures),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response;
    await act(async () => {
      response = await result.current.createTimeOff({
        staff_id: 'staff-1',
        start_date: '2024-02-01',
        end_date: '2024-02-05',
        type: 'vacation',
        reason: '',
      });
    });

    expect(response).toEqual({ success: false, error: 'Período já ocupado' });
  });

  it('deve remover ausência com sucesso', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: any) => {
      const urlString = url.toString();

      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: true } as Response);
      }

      // Default responses
      if (urlString.includes('/api/staff-time-off')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTimeOffs),
        } as Response);
      }

      if (urlString.includes('/api/closures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockClosures),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response;
    await act(async () => {
      response = await result.current.deleteTimeOff(1);
    });

    expect(response).toEqual({ success: true });
  });

  it('deve retornar ausências para um dia específico', async () => {
    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Day 3 should be within the first time off range (Feb 1-5)
    const timeOffsForDay3 = result.current.getTimeOffsForDay(3);
    expect(timeOffsForDay3).toHaveLength(1);
    expect(timeOffsForDay3[0].id).toBe(1);

    // Day 11 should be within the second time off range (Feb 10-12)
    const timeOffsForDay11 = result.current.getTimeOffsForDay(11);
    expect(timeOffsForDay11).toHaveLength(1);
    expect(timeOffsForDay11[0].id).toBe(2);

    // Day 20 should have no time offs
    const timeOffsForDay20 = result.current.getTimeOffsForDay(20);
    expect(timeOffsForDay20).toHaveLength(0);
  });

  it('deve verificar se dia é folga semanal', async () => {
    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Feb 5, 2024 is a Monday (day of week 1)
    const isMondayClosure = result.current.isWeeklyClosureDay(5);
    expect(isMondayClosure).toBe(true);

    // Feb 6, 2024 is a Tuesday (day of week 2)
    const isTuesdayClosure = result.current.isWeeklyClosureDay(6);
    expect(isTuesdayClosure).toBe(false);
  });

  it('deve retornar info de folga semanal para um dia', async () => {
    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Feb 5, 2024 is a Monday
    const mondayInfo = result.current.getWeeklyClosureInfo(5);
    expect(mondayInfo).toBeDefined();
    expect(mondayInfo?.recurring_day_of_week).toBe(1);

    // Feb 6, 2024 is a Tuesday
    const tuesdayInfo = result.current.getWeeklyClosureInfo(6);
    expect(tuesdayInfo).toBeUndefined();
  });

  it('deve permitir refresh manual', async () => {
    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCallCount = vi.mocked(fetch).mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('deve lidar com erro no carregamento', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useStaffTimeOff({ month: 1, year: 2024 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.timeOffs).toEqual([]);
  });

  it('deve re-carregar quando mês ou ano mudam', async () => {
    const { result, rerender } = renderHook(
      ({ month, year }) => useStaffTimeOff({ month, year }),
      {
        initialProps: { month: 1, year: 2024 },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCallCount = vi.mocked(fetch).mock.calls.length;

    rerender({ month: 2, year: 2024 });

    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});
