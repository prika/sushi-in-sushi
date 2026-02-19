-- Migration 030: Seed game questions (quiz + preference)
-- Global questions (restaurant_id = NULL) available to all restaurants

-- =============================================
-- QUIZ QUESTIONS (~20)
-- =============================================

INSERT INTO game_questions (game_type, question_text, options, correct_answer_index, category, difficulty, points) VALUES
-- Sushi Knowledge
('quiz', 'Qual é o peixe mais popular no sushi?', '["Salmão", "Atum", "Polvo", "Enguia"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'O que é wasabi verdadeiro?', '["Uma raiz japonesa", "Uma pasta artificial", "Uma alga", "Uma flor"]', 0, 'sushi_knowledge', 2, 10),
('quiz', 'De que país é originário o sushi?', '["Japão", "China", "Coreia do Sul", "Tailândia"]', 0, 'culture', 1, 10),
('quiz', 'O que significa a palavra ''nigiri''?', '["Agarrar/Apertar", "Cortar", "Rolar", "Misturar"]', 0, 'sushi_knowledge', 2, 10),
('quiz', 'O que dá a cor rosa ao gengibre de sushi?', '["Vinagre de arroz", "Corante alimentar", "Beterraba/processo natural", "É a cor natural"]', 2, 'ingredients', 2, 10),
('quiz', 'Quantas peças tem um maki roll standard?', '["6 a 8", "2 a 3", "10 a 12", "15 ou mais"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'O que é nori?', '["Alga marinha seca", "Arroz temperado", "Peixe curado", "Molho de soja especial"]', 0, 'ingredients', 1, 10),
('quiz', 'Qual é a temperatura ideal do arroz de sushi?', '["Temperatura corporal (~37°C)", "Frio de frigorífico", "Muito quente", "Congelado"]', 0, 'techniques', 3, 10),
('quiz', 'O que é sashimi?', '["Peixe cru sem arroz", "Peixe cru com arroz", "Peixe frito", "Peixe grelhado"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'Qual é a faca tradicional para cortar sushi?', '["Yanagiba", "Santoku", "Nakiri", "Deba"]', 0, 'techniques', 3, 10),

-- Ingredients
('quiz', 'Qual destes NÃO é um tipo de sushi?', '["Ramen", "Nigiri", "Temaki", "Uramaki"]', 0, 'sushi_knowledge', 1, 10),
('quiz', 'O que é ponzu?', '["Molho cítrico japonês", "Um tipo de sushi", "Arroz de sushi", "Peixe fumado"]', 0, 'ingredients', 2, 10),
('quiz', 'Qual é o ingrediente principal do miso?', '["Soja fermentada", "Alga", "Arroz", "Peixe"]', 0, 'ingredients', 2, 10),
('quiz', 'O que é edamame?', '["Vagem de soja verde", "Alga frita", "Tofu grelhado", "Cogumelo japonês"]', 0, 'ingredients', 1, 10),
('quiz', 'Qual peixe é conhecido como ''maguro'' em japonês?', '["Atum", "Salmão", "Dourada", "Robalo"]', 0, 'ingredients', 2, 10),

-- Culture
('quiz', 'Como se diz ''obrigado'' em japonês?', '["Arigatou", "Konnichiwa", "Sayonara", "Sumimasen"]', 0, 'culture', 1, 10),
('quiz', 'O que significa ''omakase''?', '["Confiar no chef", "Menu fixo", "Buffet livre", "Pedido rápido"]', 0, 'culture', 2, 10),
('quiz', 'Em que lado se coloca o molho de soja?', '["No peixe, não no arroz", "No arroz", "Em ambos", "Nunca se usa"]', 0, 'culture', 2, 10),
('quiz', 'Qual é a bebida alcoólica tradicional japonesa feita de arroz?', '["Sake", "Shochu", "Umeshu", "Awamori"]', 0, 'culture', 1, 10),
('quiz', 'Quantos anos demora a formação de um sushi chef tradicional?', '["Cerca de 10 anos", "1 ano", "3 meses", "20 anos"]', 0, 'culture', 3, 10);

-- =============================================
-- PREFERENCE QUESTIONS (~15)
-- =============================================

INSERT INTO game_questions (game_type, question_text, option_a, option_b, category, points) VALUES
('preference', 'Preferes...', '{"label": "Nigiri"}', '{"label": "Maki"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Salmão"}', '{"label": "Atum"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Quente"}', '{"label": "Frio"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Cru"}', '{"label": "Cozinhado"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Com wasabi"}', '{"label": "Sem wasabi"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Molho de soja"}', '{"label": "Ponzu"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Tempura"}', '{"label": "Grelhado"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Uramaki"}', '{"label": "Temaki"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Edamame"}', '{"label": "Gyoza"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Sake"}', '{"label": "Cerveja japonesa"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Sashimi"}', '{"label": "Nigiri"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Camarão"}', '{"label": "Polvo"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Doce"}', '{"label": "Salgado"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Miso soup"}', '{"label": "Ramen"}', 'preferences', 10),
('preference', 'Preferes...', '{"label": "Chopsticks"}', '{"label": "Garfo"}', 'preferences', 10);
