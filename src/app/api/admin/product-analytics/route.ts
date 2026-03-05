import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SAFETY_LIMIT = 50_000;

/**
 * GET /api/admin/product-analytics?from=ISO_DATE&to=ISO_DATE
 * Returns aggregated product analytics (admin only).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios' }, { status: 400 });
    }

    const fromDate = new Date(from);
    const toEnd = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toEnd.getTime())) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
    }

    const fromISO = fromDate.toISOString();
    toEnd.setHours(23, 59, 59, 999);
    const toISO = toEnd.toISOString();

    const supabase = createAdminClient();

    const [ordersRes, productsRes, categoriesRes, ratingsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('product_id, quantity, unit_price, status, created_at')
        .neq('status', 'cancelled')
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .limit(SAFETY_LIMIT),
      supabase.from('products').select('id, name, price, category_id'),
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase
        .from('product_ratings')
        .select('product_id, rating, created_at')
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .limit(SAFETY_LIMIT),
    ]);

    if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
    if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
    if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const ratings = ratingsRes.data || [];

    // Build lookup maps
    const productMap = new Map<string, { name: string; categoryId: number | null }>();
    for (const p of products) {
      productMap.set(String(p.id), { name: p.name, categoryId: Number(p.category_id) || null });
    }

    const categoryMap = new Map<number, string>();
    for (const c of categories) {
      categoryMap.set(Number(c.id), c.name);
    }

    // Aggregate by product
    const productStats = new Map<string, { revenue: number; quantity: number }>();
    for (const o of orders) {
      const pid = String(o.product_id);
      const entry = productStats.get(pid) || { revenue: 0, quantity: 0 };
      entry.revenue += o.quantity * o.unit_price;
      entry.quantity += o.quantity;
      productStats.set(pid, entry);
    }

    // 1. Top 10 by revenue
    const topByRevenue = Array.from(productStats.entries())
      .map(([pid, stats]) => ({
        productId: pid,
        name: productMap.get(pid)?.name || 'Desconhecido',
        revenue: Math.round(stats.revenue * 100) / 100,
        category: categoryMap.get(productMap.get(pid)?.categoryId ?? -1) || 'Sem categoria',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 2. Top 10 by quantity
    const topByQuantity = Array.from(productStats.entries())
      .map(([pid, stats]) => ({
        productId: pid,
        name: productMap.get(pid)?.name || 'Desconhecido',
        quantity: stats.quantity,
        category: categoryMap.get(productMap.get(pid)?.categoryId ?? -1) || 'Sem categoria',
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // 3. Category revenue distribution
    const categoryRevMap = new Map<string, number>();
    Array.from(productStats.entries()).forEach(([pid, stats]) => {
      const catName = categoryMap.get(productMap.get(pid)?.categoryId ?? -1) || 'Sem categoria';
      categoryRevMap.set(catName, (categoryRevMap.get(catName) || 0) + stats.revenue);
    });
    const totalCatRevenue = Array.from(categoryRevMap.values()).reduce((a, b) => a + b, 0);
    const categoryRevenue = Array.from(categoryRevMap.entries())
      .map(([category, revenue]) => ({
        category,
        revenue: Math.round(revenue * 100) / 100,
        percentage: totalCatRevenue > 0 ? Math.round((revenue / totalCatRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 4. Ratings distribution (1-5)
    const ratingCounts = [0, 0, 0, 0, 0];
    for (const r of ratings) {
      const idx = Math.max(0, Math.min(4, r.rating - 1));
      ratingCounts[idx]++;
    }
    const ratingsDistribution = ratingCounts.map((count, i) => ({ rating: i + 1, count }));

    // 5. Revenue by category over time (weekly)
    const catTimeMap = new Map<string, Map<string, number>>();
    for (const o of orders) {
      const pid = String(o.product_id);
      const catName = categoryMap.get(productMap.get(pid)?.categoryId ?? -1) || 'Sem categoria';
      const d = new Date(o.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!catTimeMap.has(weekKey)) catTimeMap.set(weekKey, new Map());
      const weekEntry = catTimeMap.get(weekKey)!;
      weekEntry.set(catName, (weekEntry.get(catName) || 0) + o.quantity * o.unit_price);
    }

    const allCatNames = Array.from(new Set(
      Array.from(catTimeMap.values()).flatMap((m) => Array.from(m.keys()))
    ));
    const revenueByCategoryOverTime = Array.from(catTimeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, catMap]) => {
        const entry: Record<string, number | string> = { week };
        for (const cat of allCatNames) {
          entry[cat] = Math.round((catMap.get(cat) || 0) * 100) / 100;
        }
        return entry;
      });

    // 6. Rated vs ordered (scatter)
    const ratingsByProduct = new Map<string, number[]>();
    for (const r of ratings) {
      const pid = String(r.product_id);
      if (!ratingsByProduct.has(pid)) ratingsByProduct.set(pid, []);
      ratingsByProduct.get(pid)!.push(r.rating);
    }
    const ratedVsOrdered = Array.from(productStats.entries())
      .filter(([pid]) => ratingsByProduct.has(pid))
      .map(([pid, stats]) => {
        const productRatings = ratingsByProduct.get(pid)!;
        return {
          productId: pid,
          name: productMap.get(pid)?.name || 'Desconhecido',
          avgRating: Math.round((productRatings.reduce((a, b) => a + b, 0) / productRatings.length) * 10) / 10,
          totalOrdered: stats.quantity,
          revenue: Math.round(stats.revenue * 100) / 100,
        };
      })
      .sort((a, b) => b.totalOrdered - a.totalOrdered);

    // Summary stats
    const totalRevenue = orders.reduce((sum, o) => sum + o.quantity * o.unit_price, 0);
    const totalOrders = orders.length;
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
      : 0;

    return NextResponse.json({
      meta: { from, to, totalRevenue: Math.round(totalRevenue * 100) / 100, totalOrders, avgRating },
      topByRevenue,
      topByQuantity,
      categoryRevenue,
      ratingsDistribution,
      revenueByCategoryOverTime,
      categoryNames: allCatNames,
      ratedVsOrdered,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    console.error('Product analytics error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar analytics de produtos' },
      { status: 500 }
    );
  }
}
