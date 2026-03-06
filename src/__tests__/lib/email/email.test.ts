import { describe, it, expect, vi, beforeEach } from "vitest";

// Declare mocks via vi.hoisted so they are available inside vi.mock factories
const { mockSend, mockEq, mockUpdate, mockFrom, mockAdminFrom } = vi.hoisted(() => {
  const mockSend = vi.fn();
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ update: mockUpdate }));

  // Admin client chain for fetchLocationInfo: from().select().eq().single()
  const mockAdminSingle = vi.fn().mockResolvedValue({
    data: { name: "Circunvalação", address: "Rua da Circunvalação 1234", phone: "+351220123456", email: "circ@test.com", latitude: 41.15, longitude: -8.62, google_maps_url: "https://maps.google.com", brand_name: "Sushi in Sushi" },
  });
  const mockAdminEq = vi.fn(() => ({ single: mockAdminSingle }));
  const mockAdminSelect = vi.fn(() => ({ eq: mockAdminEq }));
  const mockAdminFrom = vi.fn(() => ({ select: mockAdminSelect }));

  return { mockSend, mockEq, mockUpdate, mockFrom, mockAdminFrom };
});

// Mock Resend
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: mockSend };
    },
  };
});

// Mock templates
vi.mock("@/lib/email/templates", () => ({
  getCustomerConfirmationEmail: vi.fn(() => ({
    subject: "Reserva Recebida",
    html: "<p>confirm</p>",
  })),
  getRestaurantNotificationEmail: vi.fn(() => ({
    subject: "Nova Reserva",
    html: "<p>notify</p>",
  })),
  getReservationConfirmedEmail: vi.fn(() => ({
    subject: "Reserva Confirmada",
    html: "<p>confirmed</p>",
  })),
  getFarewellEmail: vi.fn(() => ({
    subject: "Obrigado",
    html: "<p>farewell</p>",
  })),
  getCancellationEmail: vi.fn(() => ({
    subject: "Cancelamento",
    html: "<p>cancel</p>",
  })),
  getDayBeforeReminderEmail: vi.fn(() => ({
    subject: "Lembrete",
    html: "<p>reminder</p>",
  })),
  getSameDayReminderEmail: vi.fn(() => ({
    subject: "Lembrete Hoje",
    html: "<p>today</p>",
  })),
  initLogoUrl: vi.fn(() => Promise.resolve()),
  initBrandName: vi.fn(() => Promise.resolve()),
}));

// Mock Supabase for email tracking (createClient) and location lookup (createAdminClient)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import type { Reservation } from "@/types/database";
import {
  sendReservationEmails,
  sendReservationConfirmedEmail,
  sendFarewellEmail,
  sendCancellationEmail,
  sendDayBeforeReminderEmail,
  sendSameDayReminderEmail,
} from "@/lib/email";

// Note: The source module captures several env vars as module-level constants at import time:
//   - FROM_EMAIL = process.env.FROM_EMAIL (set to 'test@test.com' by setup.ts)
//   - RESTAURANT_EMAILS = { circunvalacao: process.env.RESTAURANT_EMAIL_1 || '', ... }
//   - TEST_EMAIL_OVERRIDE = process.env.TEST_EMAIL_OVERRIDE (undefined at import time)
// Only isEmailConfigured() reads process.env dynamically on each call.
// The module-level FROM_EMAIL comes from the global test setup (setup.ts).
const CAPTURED_FROM_EMAIL = "test@test.com";

const mockReservation: Reservation = {
  id: "res-1",
  first_name: "Joao",
  last_name: "Silva",
  email: "joao@test.com",
  phone: "+351912345678",
  reservation_date: "2026-03-01",
  reservation_time: "19:30",
  party_size: 4,
  location: "circunvalacao",
  status: "pending",
  is_rodizio: false,
  special_requests: null,
  occasion: null,
  marketing_consent: false,
  table_id: null,
  confirmed_by: null,
  confirmed_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  session_id: null,
  seated_at: null,
  customer_email_id: null,
  customer_email_sent_at: null,
  customer_email_delivered_at: null,
  customer_email_opened_at: null,
  customer_email_status: null,
  confirmation_email_id: null,
  confirmation_email_sent_at: null,
  confirmation_email_delivered_at: null,
  confirmation_email_opened_at: null,
  confirmation_email_status: null,
  day_before_reminder_id: null,
  day_before_reminder_sent_at: null,
  day_before_reminder_delivered_at: null,
  day_before_reminder_opened_at: null,
  day_before_reminder_status: null,
  same_day_reminder_id: null,
  same_day_reminder_sent_at: null,
  same_day_reminder_delivered_at: null,
  same_day_reminder_opened_at: null,
  same_day_reminder_status: null,
  created_at: "2026-02-20T10:00:00Z",
  updated_at: "2026-02-20T10:00:00Z",
};

// Suppress console output in tests
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("Email Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore env vars so isEmailConfigured() returns true
    // (tests that set RESEND_API_KEY="" pollute process.env for subsequent tests)
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.FROM_EMAIL = CAPTURED_FROM_EMAIL;

    // Reset the chaining mocks
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  // =========================================================================
  // sendReservationEmails
  // =========================================================================
  describe("sendReservationEmails", () => {
    it("should send both customer and restaurant emails successfully", async () => {
      mockSend
        .mockResolvedValueOnce({ data: { id: "email-cust-1" }, error: null })
        .mockResolvedValueOnce({ data: { id: "email-rest-1" }, error: null });

      const result = await sendReservationEmails(mockReservation);

      expect(result.customerEmail.success).toBe(true);
      expect(result.customerEmail.error).toBeNull();
      expect(result.restaurantEmail.success).toBe(true);
      expect(result.restaurantEmail.error).toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(2);

      // First call: customer email
      expect(mockSend).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          to: "joao@test.com",
          subject: "Reserva Recebida",
          from: `Sushi in Sushi <${CAPTURED_FROM_EMAIL}>`,
        }),
      );

      // Second call: restaurant email (RESTAURANT_EMAIL_1 not set in test setup,
      // so the module-level RESTAURANT_EMAILS.circunvalacao is empty string)
      expect(mockSend).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          subject: "Nova Reserva",
          from: `Reservas Online <${CAPTURED_FROM_EMAIL}>`,
        }),
      );
    });

    it("should return error for customer email but still send restaurant email", async () => {
      mockSend
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Customer send failed" },
        })
        .mockResolvedValueOnce({ data: { id: "email-rest-2" }, error: null });

      const result = await sendReservationEmails(mockReservation);

      expect(result.customerEmail.success).toBe(false);
      expect(result.customerEmail.error).toBe("Customer send failed");
      expect(result.restaurantEmail.success).toBe(true);
      expect(result.restaurantEmail.error).toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should return error for restaurant email when it fails", async () => {
      mockSend
        .mockResolvedValueOnce({ data: { id: "email-cust-3" }, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Restaurant send failed" },
        });

      const result = await sendReservationEmails(mockReservation);

      expect(result.customerEmail.success).toBe(true);
      expect(result.customerEmail.error).toBeNull();
      expect(result.restaurantEmail.success).toBe(false);
      expect(result.restaurantEmail.error).toBe("Restaurant send failed");
    });

    it("should log instead of sending when email is not configured", async () => {
      // isEmailConfigured() checks process.env.RESEND_API_KEY dynamically
      process.env.RESEND_API_KEY = "";

      const result = await sendReservationEmails(mockReservation);

      expect(result.customerEmail.success).toBe(false);
      expect(result.customerEmail.error).toBe("Email not configured");
      expect(result.restaurantEmail.success).toBe(false);
      expect(result.restaurantEmail.error).toBe("Email not configured");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should update email tracking after successful customer email", async () => {
      mockSend
        .mockResolvedValueOnce({
          data: { id: "email-cust-track" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: "email-rest-track" },
          error: null,
        });

      await sendReservationEmails(mockReservation);

      // Verify email tracking update was called for the customer email
      expect(mockFrom).toHaveBeenCalledWith("reservations");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email_id: "email-cust-track",
          customer_email_status: "sent",
        }),
      );
      expect(mockEq).toHaveBeenCalledWith("id", "res-1");
    });
  });

  // =========================================================================
  // sendReservationConfirmedEmail
  // =========================================================================
  describe("sendReservationConfirmedEmail", () => {
    it("should send confirmation email and update tracking", async () => {
      mockSend.mockResolvedValue({ data: { id: "email-conf-1" }, error: null });

      const result = await sendReservationConfirmedEmail(mockReservation);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.emailId).toBe("email-conf-1");
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "joao@test.com",
          subject: "Reserva Confirmada",
        }),
      );

      // Verify email tracking update was called
      expect(mockFrom).toHaveBeenCalledWith("reservations");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmation_email_id: "email-conf-1",
          confirmation_email_status: "sent",
        }),
      );
      expect(mockEq).toHaveBeenCalledWith("id", "res-1");
    });

    it("should return error when Resend returns an error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Confirmation failed" },
      });

      const result = await sendReservationConfirmedEmail(mockReservation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Confirmation failed");
      expect(result.emailId).toBeNull();
    });

    it("should return not configured error when RESEND_API_KEY is missing", async () => {
      process.env.RESEND_API_KEY = "";

      const result = await sendReservationConfirmedEmail(mockReservation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email not configured");
      expect(result.emailId).toBeNull();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // sendFarewellEmail
  // =========================================================================
  describe("sendFarewellEmail", () => {
    it("should send farewell email successfully", async () => {
      mockSend.mockResolvedValue({
        data: { id: "email-farewell-1" },
        error: null,
      });

      const result = await sendFarewellEmail(mockReservation);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "joao@test.com",
          subject: "Obrigado",
        }),
      );
    });

    it("should return error when Resend returns an error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Farewell send failed" },
      });

      const result = await sendFarewellEmail(mockReservation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Farewell send failed");
    });

    it("should return not configured error when RESEND_API_KEY is missing", async () => {
      process.env.RESEND_API_KEY = "";

      const result = await sendFarewellEmail(mockReservation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email not configured");
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // sendCancellationEmail
  // =========================================================================
  describe("sendCancellationEmail", () => {
    it("should send cancellation email successfully", async () => {
      mockSend.mockResolvedValue({
        data: { id: "email-cancel-1" },
        error: null,
      });

      const result = await sendCancellationEmail(
        mockReservation,
        "Restaurante lotado",
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "joao@test.com",
          subject: "Cancelamento",
        }),
      );
    });

    it("should return error when Resend returns an error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Cancel send failed" },
      });

      const result = await sendCancellationEmail(
        mockReservation,
        "Motivo qualquer",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cancel send failed");
    });
  });

  // =========================================================================
  // sendDayBeforeReminderEmail
  // =========================================================================
  describe("sendDayBeforeReminderEmail", () => {
    it("should send day-before reminder email with default wasteFee", async () => {
      mockSend.mockResolvedValue({
        data: { id: "email-reminder-1" },
        error: null,
      });

      const result = await sendDayBeforeReminderEmail(mockReservation);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.emailId).toBe("email-reminder-1");
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "joao@test.com",
          subject: "Lembrete",
        }),
      );
    });

    it("should return error when Resend returns an error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Reminder send failed" },
      });

      const result = await sendDayBeforeReminderEmail(mockReservation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reminder send failed");
      expect(result.emailId).toBeNull();
    });
  });

  // =========================================================================
  // sendSameDayReminderEmail
  // =========================================================================
  describe("sendSameDayReminderEmail", () => {
    it("should send same-day reminder email successfully", async () => {
      mockSend.mockResolvedValue({
        data: { id: "email-sameday-1" },
        error: null,
      });

      const result = await sendSameDayReminderEmail(mockReservation);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.emailId).toBe("email-sameday-1");
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "joao@test.com",
          subject: "Lembrete Hoje",
        }),
      );
    });

    it("should return error when Resend returns an error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Same-day send failed" },
      });

      const result = await sendSameDayReminderEmail(mockReservation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Same-day send failed");
      expect(result.emailId).toBeNull();
    });

    it("should handle exception thrown by Resend", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const result = await sendSameDayReminderEmail(mockReservation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.emailId).toBeNull();
    });
  });
});
