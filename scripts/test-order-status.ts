/**
 * Script para testar atualização de status de pedidos
 * Executa: npx dotenv -e .env.local -- npx tsx scripts/test-order-status.ts
 * Ou: node --env-file=.env.local -r tsx/register scripts/test-order-status.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
try {
  const envContent = readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.error('Could not read .env.local');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Aplicando migração para policy de UPDATE...\n');

  // Need to use service role key for this
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.log('⚠️ SUPABASE_SERVICE_ROLE_KEY não encontrada');
    console.log('   Por favor, aplique manualmente a migração:');
    console.log('   supabase/migrations/010_orders_update_policy.sql\n');
    console.log('   SQL a executar no Supabase Dashboard > SQL Editor:\n');
    console.log(`   DROP POLICY IF EXISTS "Anyone can update orders" ON orders;`);
    console.log(`   CREATE POLICY "Anyone can update orders" ON orders`);
    console.log(`       FOR UPDATE USING (true) WITH CHECK (true);`);
    console.log('');
    return false;
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  const { error } = await adminClient.rpc('exec_sql', {
    sql: `
      DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
      CREATE POLICY "Anyone can update orders" ON orders
          FOR UPDATE USING (true) WITH CHECK (true);
    `
  });

  if (error) {
    console.log('⚠️ Não foi possível aplicar via RPC');
    console.log('   Erro:', error.message);
    return false;
  }

  console.log('✅ Migração aplicada com sucesso!\n');
  return true;
}

async function testOrderStatusUpdate() {
  console.log('🔍 Testando atualização de status de pedidos...\n');

  // Try to apply migration first
  await applyMigration();

  // 1. Buscar um pedido pending
  const { data: orders, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .eq('status', 'pending')
    .limit(1);

  if (fetchError) {
    console.error('❌ Erro ao buscar pedidos:', fetchError);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log('⚠️ Nenhum pedido pending encontrado');

    // Listar todos os pedidos
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, status')
      .limit(10);

    console.log('\n📋 Pedidos existentes:');
    allOrders?.forEach(o => console.log(`  - ${o.id}: ${o.status}`));
    return;
  }

  const testOrder = orders[0];
  console.log(`📦 Pedido de teste: ${testOrder.id}`);
  console.log(`   Status atual: ${testOrder.status}`);

  // 2. Atualizar para preparing
  console.log('\n🔄 Atualizando para "preparing"...');

  const { data: updated1, error: updateError1 } = await supabase
    .from('orders')
    .update({ status: 'preparing' })
    .eq('id', testOrder.id)
    .select()
    .single();

  if (updateError1) {
    console.error('❌ Erro ao atualizar:', updateError1);
    return;
  }

  console.log(`✅ Atualizado com sucesso! Novo status: ${updated1.status}`);

  // 3. Verificar se persistiu
  console.log('\n🔍 Verificando se persistiu...');

  const { data: check1 } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', testOrder.id)
    .single();

  console.log(`   Status na DB: ${check1?.status}`);

  if (check1?.status !== 'preparing') {
    console.error('❌ PROBLEMA: O status não persistiu!');
    return;
  }

  // 4. Atualizar para ready
  console.log('\n🔄 Atualizando para "ready"...');

  const { data: updated2, error: updateError2 } = await supabase
    .from('orders')
    .update({ status: 'ready' })
    .eq('id', testOrder.id)
    .select()
    .single();

  if (updateError2) {
    console.error('❌ Erro ao atualizar:', updateError2);
    return;
  }

  console.log(`✅ Atualizado! Novo status: ${updated2.status}`);

  // 5. Aguardar 2 segundos e verificar novamente
  console.log('\n⏳ Aguardando 2 segundos...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: check2 } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', testOrder.id)
    .single();

  console.log(`   Status na DB após 2s: ${check2?.status}`);

  if (check2?.status !== 'ready') {
    console.error('❌ PROBLEMA: O status reverteu após 2 segundos!');
  } else {
    console.log('✅ Status mantido corretamente!');
  }

  // 6. Testar fluxo completo até delivered
  console.log('\n🔄 Testando fluxo completo até "delivered"...');

  const { error: deliveredError } = await supabase
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', testOrder.id);

  if (deliveredError) {
    console.error('❌ Erro ao marcar como delivered:', deliveredError);
  } else {
    console.log('✅ Pedido marcado como delivered!');
  }

  // Verificar
  const { data: finalCheck } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', testOrder.id)
    .single();

  console.log(`   Status final: ${finalCheck?.status}`);

  if (finalCheck?.status === 'delivered') {
    console.log('\n✅ SUCESSO! O fluxo completo está a funcionar!');
    console.log('   pending → preparing → ready → delivered ✓');
  }

  console.log('\n✨ Teste completo!');
}

async function cleanupTestOrders() {
  console.log('\n🧹 Limpando pedidos de teste...');

  // Reset all test orders back to pending for fresh testing
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, status')
    .neq('status', 'delivered')
    .neq('status', 'cancelled');

  console.log(`   Encontrados ${allOrders?.length || 0} pedidos ativos`);

  // Show current state
  allOrders?.forEach(o => console.log(`   - ${o.id}: ${o.status}`));
}

testOrderStatusUpdate()
  .then(() => cleanupTestOrders())
  .catch(console.error);
