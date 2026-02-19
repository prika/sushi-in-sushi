import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseOrderRepositoryOptimized as SupabaseOrderRepository } from '@/infrastructure/repositories/SupabaseOrderRepository.optimized';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const repository = new SupabaseOrderRepository(supabase);

    const averageTime = await repository.getAveragePreparationTime(id);

    return NextResponse.json({
      productId: id,
      averagePreparationTimeMinutes: averageTime,
    });
  } catch (error) {
    console.error('Error getting average preparation time:', error);
    return NextResponse.json(
      { error: 'Failed to get average preparation time' },
      { status: 500 }
    );
  }
}
