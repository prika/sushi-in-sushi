import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/verification/verify
 * Verifies the code and associates people at the same table
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { sessionCustomerId, token } = body;

    // Validate input
    if (!sessionCustomerId || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session_customer with verification details
    const { data: sessionCustomer, error: fetchError } = await supabase
      .from('session_customers')
      .select('*, session:sessions!inner(id, table_id)')
      .eq('id', sessionCustomerId)
      .single();

    if (fetchError || !sessionCustomer) {
      console.error('Error fetching session_customer:', fetchError);
      return NextResponse.json(
        { error: 'Session customer not found' },
        { status: 404 }
      );
    }

    // Check if token matches and is not expired
    if (sessionCustomer.verification_token !== token) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (!sessionCustomer.verification_expires_at) {
      return NextResponse.json(
        { error: 'Verification token not found or expired' },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(sessionCustomer.verification_expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    const verificationType = sessionCustomer.verification_type;
    if (!verificationType || (verificationType !== 'email' && verificationType !== 'phone')) {
      return NextResponse.json(
        { error: 'Invalid verification type' },
        { status: 400 }
      );
    }

    const contactValue = verificationType === 'email'
      ? sessionCustomer.email
      : sessionCustomer.phone;

    if (!contactValue) {
      return NextResponse.json(
        { error: 'No contact value found' },
        { status: 400 }
      );
    }

    // Mark as verified
    const verifiedField = verificationType === 'email' ? 'email_verified' : 'phone_verified';
    const { error: updateError } = await supabase
      .from('session_customers')
      .update({
        [verifiedField]: true,
        verification_token: null,
        verification_expires_at: null,
        verification_type: null,
      })
      .eq('id', sessionCustomerId);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify' },
        { status: 500 }
      );
    }

    // Update verification log
    const { error: logError } = await supabase
      .from('verification_logs')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq('session_customer_id', sessionCustomerId)
      .eq('token', token)
      .eq('status', 'sent');

    if (logError) {
      console.error('Error updating verification log:', logError);
      // Continue anyway
    }

    // ASSOCIATE PEOPLE AT THE SAME TABLE WITH THE SAME CONTACT
    // Find all session_customers at the same table with the same email/phone
    const tableId = sessionCustomer.session.table_id;

    const { data: otherCustomers, error: othersError } = await supabase
      .from('session_customers')
      .select('id, session_id, session:sessions!inner(table_id)')
      .eq('sessions.table_id', tableId)
      .neq('id', sessionCustomerId)
      .eq(verificationType, contactValue);

    if (othersError) {
      console.error('Error finding other customers:', othersError);
      // Continue anyway - this is not critical
    } else if (otherCustomers && otherCustomers.length > 0) {
      // Mark all matching customers as verified
      const otherIds = otherCustomers.map(c => c.id);
      const { error: bulkUpdateError } = await supabase
        .from('session_customers')
        .update({ [verifiedField]: true })
        .in('id', otherIds);

      if (bulkUpdateError) {
        console.error('Error updating other customers:', bulkUpdateError);
        // Continue anyway
      }
    }

    // If email is verified and customer_id exists, also verify in customers table
    if (verificationType === 'email' && sessionCustomer.customer_id) {
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({ email_verified: true })
        .eq('id', sessionCustomer.customer_id);

      if (customerUpdateError) {
        console.error('Error updating customer verification:', customerUpdateError);
        // Continue anyway
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      verificationType,
      message: 'Verification successful',
      associatedCount: otherCustomers?.length || 0,
    });
  } catch (error) {
    console.error('Verification verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
