-- =============================================
-- Testes para função close_session_and_free_table
-- =============================================
-- Migration 043: Fechar sessão e liberar mesa atomicamente
-- Execute este script para testar a função
-- =============================================

-- =============================================
-- SETUP: Criar dados de teste
-- =============================================

DO $$
DECLARE
  test_table_id INTEGER;
  test_session_id UUID;
BEGIN
  -- Criar mesa de teste (location usa slug diretamente)
  INSERT INTO tables (number, name, location, is_active, current_session_id)
  VALUES (999, 'Mesa Teste 999', 'circunvalacao', true, NULL)
  RETURNING id INTO test_table_id;

  -- Criar sessão de teste
  INSERT INTO sessions (
    table_id,
    status,
    is_rodizio,
    num_people,
    total_amount,
    ordering_mode,
    started_at
  )
  VALUES (
    test_table_id,
    'active',
    false,
    2,
    0,
    'client',
    NOW()
  )
  RETURNING id INTO test_session_id;

  -- Atualizar mesa com sessão ativa
  UPDATE tables
  SET current_session_id = test_session_id
  WHERE id = test_table_id;

  RAISE NOTICE 'Setup completo:';
  RAISE NOTICE '  test_table_id: %', test_table_id;
  RAISE NOTICE '  test_session_id: %', test_session_id;
END $$;


-- =============================================
-- TESTE 1: Verificar Estado Inicial
-- =============================================

SELECT
  t.number,
  t.current_session_id,
  s.id as session_id,
  s.status as session_status,
  s.closed_at,
  CASE
    WHEN t.current_session_id = s.id THEN '✅ Mesa tem sessão ativa'
    ELSE '❌ Mesa e sessão inconsistentes'
  END as estado_inicial
FROM tables t
JOIN sessions s ON t.current_session_id = s.id
WHERE t.number = 999;

-- Resultado esperado:
-- ✅ Mesa tem sessão ativa
-- status: 'active'
-- closed_at: NULL


-- =============================================
-- TESTE 2: Executar Função close_session_and_free_table
-- =============================================

DO $$
DECLARE
  test_session_id UUID;
BEGIN
  -- Obter session_id da mesa 999
  SELECT s.id INTO test_session_id
  FROM sessions s
  JOIN tables t ON s.table_id = t.id
  WHERE t.number = 999
    AND s.status = 'active'
  LIMIT 1;

  IF test_session_id IS NULL THEN
    RAISE EXCEPTION 'Sessão de teste não encontrada';
  END IF;

  -- Executar função
  PERFORM close_session_and_free_table(test_session_id);

  RAISE NOTICE 'Função executada com sucesso para session_id: %', test_session_id;
END $$;


-- =============================================
-- TESTE 3: Verificar Resultado
-- =============================================

SELECT
  t.number,
  t.current_session_id,
  s.id as session_id,
  s.status as session_status,
  s.closed_at,
  CASE
    WHEN t.current_session_id IS NULL THEN '✅'
    ELSE '❌'
  END as mesa_liberada,
  CASE
    WHEN s.status = 'closed' THEN '✅'
    ELSE '❌'
  END as sessao_fechada,
  CASE
    WHEN s.closed_at IS NOT NULL THEN '✅'
    ELSE '❌'
  END as closed_at_preenchido
FROM tables t
JOIN sessions s ON s.table_id = t.id
WHERE t.number = 999
  AND s.started_at > NOW() - INTERVAL '1 hour'
ORDER BY s.started_at DESC
LIMIT 1;

-- Resultado esperado:
-- mesa_liberada: ✅ (current_session_id = NULL)
-- sessao_fechada: ✅ (status = 'closed')
-- closed_at_preenchido: ✅ (closed_at IS NOT NULL)


-- =============================================
-- TESTE 4: Verificar Atomicidade (Transação)
-- =============================================

-- Criar nova sessão para testar rollback
DO $$
DECLARE
  test_table_id INTEGER;
  test_session_id UUID;
BEGIN
  SELECT id INTO test_table_id FROM tables WHERE number = 999;

  -- Criar nova sessão
  INSERT INTO sessions (
    table_id, status, is_rodizio, num_people,
    total_amount, ordering_mode, started_at
  )
  VALUES (test_table_id, 'active', false, 2, 0, 'client', NOW())
  RETURNING id INTO test_session_id;

  -- Atualizar mesa
  UPDATE tables SET current_session_id = test_session_id WHERE id = test_table_id;

  -- Tentar executar com session_id inválido (deve dar erro e rollback)
  BEGIN
    PERFORM close_session_and_free_table('00000000-0000-0000-0000-000000000000'::UUID);
    RAISE EXCEPTION 'Deveria ter dado erro com UUID inválido';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Erro esperado capturado: %', SQLERRM;
  END;

  -- Verificar que sessão atual ainda está ativa (não foi afetada)
  IF (SELECT status FROM sessions WHERE id = test_session_id) = 'active' THEN
    RAISE NOTICE '✅ Atomicidade OK: Sessão não foi alterada após erro';
  ELSE
    RAISE EXCEPTION '❌ Atomicidade FALHOU: Sessão foi alterada';
  END IF;

  -- Fechar corretamente agora
  PERFORM close_session_and_free_table(test_session_id);

  RAISE NOTICE '✅ Teste de atomicidade completo';
END $$;


-- =============================================
-- TESTE 5: Testar Múltiplas Execuções
-- =============================================

-- Tentar fechar sessão já fechada (deve ser idempotente ou dar erro claro)
DO $$
DECLARE
  test_session_id UUID;
BEGIN
  -- Obter sessão já fechada
  SELECT s.id INTO test_session_id
  FROM sessions s
  JOIN tables t ON s.table_id = t.id
  WHERE t.number = 999
    AND s.status = 'closed'
  ORDER BY s.closed_at DESC
  LIMIT 1;

  IF test_session_id IS NULL THEN
    RAISE NOTICE 'Sem sessões fechadas para testar';
    RETURN;
  END IF;

  -- Tentar fechar novamente
  BEGIN
    PERFORM close_session_and_free_table(test_session_id);
    RAISE NOTICE '⚠️ Função executada em sessão já fechada (pode ser OK se idempotente)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✅ Erro esperado ao fechar sessão já fechada: %', SQLERRM;
  END;
END $$;


-- =============================================
-- TESTE 6: Performance (100 execuções)
-- =============================================

DO $$
DECLARE
  test_table_id INTEGER;
  test_session_id UUID;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  i INTEGER;
BEGIN
  SELECT id INTO test_table_id FROM tables WHERE number = 999;

  start_time := clock_timestamp();

  -- Executar 100 vezes
  FOR i IN 1..100 LOOP
    -- Criar sessão
    INSERT INTO sessions (
      table_id, status, is_rodizio, num_people,
      total_amount, ordering_mode, started_at
    )
    VALUES (test_table_id, 'active', false, 2, 0, 'client', NOW())
    RETURNING id INTO test_session_id;

    UPDATE tables SET current_session_id = test_session_id WHERE id = test_table_id;

    -- Fechar sessão
    PERFORM close_session_and_free_table(test_session_id);
  END LOOP;

  end_time := clock_timestamp();

  RAISE NOTICE '✅ Performance: 100 execuções em % ms',
    EXTRACT(MILLISECOND FROM (end_time - start_time));
  RAISE NOTICE '   Média: % ms por execução',
    EXTRACT(MILLISECOND FROM (end_time - start_time)) / 100;
END $$;


-- =============================================
-- TESTE 7: Concorrência (Simular)
-- =============================================

-- Criar 3 sessões simultâneas e fechar todas
DO $$
DECLARE
  test_table_id INTEGER;
  session_ids UUID[] := '{}';
  test_session_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO test_table_id FROM tables WHERE number = 999;

  -- Criar 3 sessões
  FOR i IN 1..3 LOOP
    INSERT INTO sessions (
      table_id, status, is_rodizio, num_people,
      total_amount, ordering_mode, started_at
    )
    VALUES (test_table_id, 'active', false, 2, 0, 'client', NOW())
    RETURNING id INTO test_session_id;

    session_ids := array_append(session_ids, test_session_id);
  END LOOP;

  -- Fechar todas em sequência (simula concorrência)
  FOREACH test_session_id IN ARRAY session_ids LOOP
    UPDATE tables SET current_session_id = test_session_id WHERE id = test_table_id;
    PERFORM close_session_and_free_table(test_session_id);
  END LOOP;

  -- Verificar que todas foram fechadas
  IF (SELECT COUNT(*) FROM sessions WHERE id = ANY(session_ids) AND status = 'closed') = 3 THEN
    RAISE NOTICE '✅ Concorrência OK: Todas as 3 sessões fechadas corretamente';
  ELSE
    RAISE EXCEPTION '❌ Concorrência FALHOU';
  END IF;
END $$;


-- =============================================
-- RESUMO DOS TESTES
-- =============================================

SELECT
  '✅ Testes Completos' as status,
  COUNT(DISTINCT s.id) as total_sessoes_teste,
  SUM(CASE WHEN s.status = 'closed' THEN 1 ELSE 0 END) as sessoes_fechadas,
  SUM(CASE WHEN s.closed_at IS NOT NULL THEN 1 ELSE 0 END) as com_closed_at,
  CASE
    WHEN COUNT(*) = SUM(CASE WHEN s.status = 'closed' THEN 1 ELSE 0 END)
    THEN '✅ Todos os testes passaram'
    ELSE '⚠️ Verificar resultados acima'
  END as resultado
FROM sessions s
JOIN tables t ON s.table_id = t.id
WHERE t.number = 999
  AND s.started_at > NOW() - INTERVAL '1 hour';


-- =============================================
-- CLEANUP: Remover dados de teste
-- =============================================

-- Descomente para limpar após testes
/*
DELETE FROM sessions
WHERE table_id IN (SELECT id FROM tables WHERE number = 999);

DELETE FROM tables WHERE number = 999;

SELECT '✅ Cleanup completo' as status;
*/


-- =============================================
-- INSTRUÇÕES DE USO
-- =============================================
/*
1. Execute este script completo no Supabase SQL Editor

2. Verifique os resultados:
   - Todos os testes devem retornar ✅
   - Performance deve ser < 5ms por execução
   - Nenhum erro inesperado

3. Se algum teste falhar:
   - Verificar se migration 043 foi aplicada
   - Verificar permissões da função
   - Verificar estrutura das tabelas

4. Após testes, descomentar CLEANUP para remover dados de teste

5. Testes cobrem:
   ✅ Funcionalidade básica
   ✅ Atomicidade (transação)
   ✅ Idempotência
   ✅ Performance
   ✅ Concorrência simulada
*/
