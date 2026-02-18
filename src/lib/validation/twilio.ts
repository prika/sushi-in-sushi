/**
 * Twilio validation utilities
 */

export interface TwilioValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Normalizes a phone number by removing all formatting characters (spaces, dashes, parentheses, etc.)
 * keeping only digits and the + prefix
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number
 */
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all characters except digits and +
  return phoneNumber.replace(/[^\d+]/g, '');
}

/**
 * Validates that the recipient phone number is not the same as the Twilio sender number
 * Compares normalized versions of both numbers to catch differently formatted same numbers
 * @param contactValue - The recipient phone number
 * @param twilioSenderNumber - The Twilio sender number (from TWILIO_PHONE_NUMBER env var)
 * @returns Validation result with error message if invalid
 */
export function validateContactNotSameAsSender(
  contactValue: string,
  twilioSenderNumber: string | undefined
): TwilioValidationResult {
  if (!twilioSenderNumber) {
    return { isValid: true }; // If no sender number configured, skip validation
  }

  // Normalize both numbers before comparing
  const normalizedContact = normalizePhoneNumber(contactValue);
  const normalizedSender = normalizePhoneNumber(twilioSenderNumber);

  if (normalizedContact === normalizedSender) {
    return {
      isValid: false,
      error: 'Cannot send SMS to the same number as the Twilio sender. Please use a different phone number for testing.',
    };
  }

  return { isValid: true };
}

/**
 * Checks if Twilio is properly configured with required environment variables
 * @returns true if all required Twilio env vars are set
 */
export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}
