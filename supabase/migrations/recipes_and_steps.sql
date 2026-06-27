-- Migration: recipes + step_logs
-- Ejecutar en Supabase SQL Editor

-- ── RECETAS ──────────────────────────────────────────────────────────────────
create table if not exists hunterfit.recipes (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade, -- null = receta global
  title           text not null,
  description_es  text,
  category        text not null default 'comida', -- desayuno|comida|cena|snack|postre
  servings        integer not null default 1,
  prep_minutes    integer not null default 15,
  kcal            numeric(8,1) not null,
  protein_g       numeric(6,1) not null default 0,
  carbs_g         numeric(6,1) not null default 0,
  fat_g           numeric(6,1) not null default 0,
  fiber_g         numeric(6,1) not null default 0,
  ingredients     jsonb not null default '[]', -- [{name,quantity_g,kcal,protein_g,carbs_g,fat_g}]
  instructions_es text not null default '',
  image_url       text,
  tags            text[] default '{}',          -- ['alto-proteina','vegano','rapido',...]
  is_public       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists recipes_category_idx on hunterfit.recipes(category);
create index if not exists recipes_user_idx     on hunterfit.recipes(user_id);

alter table hunterfit.recipes enable row level security;

-- Recetas globales (user_id null) son visibles para todos
create policy "read_recipes" on hunterfit.recipes
  for select using (is_public = true or auth.uid() = user_id);

create policy "insert_own_recipe" on hunterfit.recipes
  for insert with check (auth.uid() = user_id);

create policy "update_own_recipe" on hunterfit.recipes
  for update using (auth.uid() = user_id);

create policy "delete_own_recipe" on hunterfit.recipes
  for delete using (auth.uid() = user_id);

-- ── PASOS / STEPS ────────────────────────────────────────────────────────────
create table if not exists hunterfit.step_logs (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  steps       integer not null default 0,
  distance_m  numeric(8,1),
  calories    numeric(6,1),
  source      text not null default 'pedometer', -- 'pedometer'|'healthkit'|'google_fit'|'manual'
  logged_at   timestamptz not null default now(),
  unique(user_id, date)
);

alter table hunterfit.step_logs enable row level security;
create policy "user_own_steps" on hunterfit.step_logs
  for all using (auth.uid() = user_id);

-- ── SEED: recetas globales ────────────────────────────────────────────────────
insert into hunterfit.recipes
  (user_id, title, description_es, category, servings, prep_minutes,
   kcal, protein_g, carbs_g, fat_g, fiber_g, ingredients, instructions_es, tags, is_public)
values

('00000000-0000-0000-0000-000000000000'::uuid,
 'Bowl de pollo y quinoa',
 'Alto en proteína, perfecto post-entrenamiento.',
 'comida', 1, 20, 480, 42, 45, 10, 6,
 '[{"name":"Pechuga de pollo cocida","quantity_g":150,"kcal":248,"protein_g":46,"carbs_g":0,"fat_g":5},{"name":"Quinoa cocida","quantity_g":150,"kcal":180,"protein_g":7,"carbs_g":32,"fat_g":3},{"name":"Brócoli","quantity_g":80,"kcal":27,"protein_g":2,"carbs_g":5,"fat_g":0},{"name":"Aceite de oliva","quantity_g":10,"kcal":88,"protein_g":0,"carbs_g":0,"fat_g":10}]',
 '1. Cocina el pollo a la plancha con sal y pimienta.\n2. Hierve la quinoa 15 min.\n3. Cocina el brócoli al vapor 5 min.\n4. Sirve todo en bowl, rocía aceite de oliva.',
 ARRAY['alto-proteina','meal-prep','sin-gluten'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Avena proteica con plátano',
 'Desayuno energizante en 5 minutos.',
 'desayuno', 1, 5, 380, 28, 52, 6, 5,
 '[{"name":"Avena en hojuelas","quantity_g":50,"kcal":194,"protein_g":8,"carbs_g":33,"fat_g":3},{"name":"Proteína whey vainilla","quantity_g":30,"kcal":111,"protein_g":21,"carbs_g":4,"fat_g":2},{"name":"Plátano","quantity_g":120,"kcal":107,"protein_g":1,"carbs_g":27,"fat_g":0},{"name":"Leche descremada","quantity_g":200,"kcal":68,"protein_g":7,"carbs_g":10,"fat_g":0}]',
 '1. Mezcla la avena con la leche y cocina 2 min en microondas.\n2. Añade la proteína y mezcla bien.\n3. Corta el plátano encima.\n4. Opcional: canela al gusto.',
 ARRAY['alto-proteina','rapido','desayuno'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Omelette de claras con espinaca',
 'Bajo en calorías, alto en proteína.',
 'desayuno', 1, 10, 220, 28, 4, 10, 2,
 '[{"name":"Clara de huevo","quantity_g":165,"kcal":86,"protein_g":18,"carbs_g":1,"fat_g":0},{"name":"Espinaca cruda","quantity_g":60,"kcal":14,"protein_g":2,"carbs_g":2,"fat_g":0},{"name":"Queso fresco","quantity_g":30,"kcal":79,"protein_g":5,"carbs_g":1,"fat_g":6},{"name":"Aceite de oliva","quantity_g":5,"kcal":44,"protein_g":0,"carbs_g":0,"fat_g":5}]',
 '1. Bate las claras con sal y pimienta.\n2. Saltea la espinaca 1 min en sartén con aceite.\n3. Vierte las claras y cocina a fuego medio-bajo.\n4. Añade el queso, dobla el omelette.',
 ARRAY['bajo-calorias','alto-proteina','sin-carbs','keto'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Ensalada de atún con aguacate',
 'Rica en omega-3 y grasas saludables.',
 'comida', 1, 10, 350, 30, 12, 20, 7,
 '[{"name":"Atún en agua (lata)","quantity_g":140,"kcal":153,"protein_g":33,"carbs_g":0,"fat_g":2},{"name":"Aguacate","quantity_g":100,"kcal":160,"protein_g":2,"carbs_g":9,"fat_g":15},{"name":"Jitomate","quantity_g":100,"kcal":18,"protein_g":1,"carbs_g":4,"fat_g":0},{"name":"Lechuga romana","quantity_g":80,"kcal":14,"protein_g":1,"carbs_g":3,"fat_g":0},{"name":"Limón","quantity_g":20,"kcal":6,"protein_g":0,"carbs_g":2,"fat_g":0}]',
 '1. Escurre el atún y desmenúzalo.\n2. Corta el aguacate en cubos.\n3. Pica el jitomate y mezcla todo.\n4. Exprime el limón, sazona con sal y pimienta.',
 ARRAY['alto-proteina','sin-gluten','omega3','keto'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Tacos de pollo con pico de gallo',
 'Versión fit de los tacos clásicos.',
 'comida', 2, 25, 520, 38, 50, 12, 6,
 '[{"name":"Pechuga de pollo cocida","quantity_g":200,"kcal":330,"protein_g":62,"carbs_g":0,"fat_g":7},{"name":"Tortilla de maíz","quantity_g":104,"kcal":227,"protein_g":6,"carbs_g":48,"fat_g":3},{"name":"Jitomate","quantity_g":80,"kcal":14,"protein_g":1,"carbs_g":3,"fat_g":0},{"name":"Cebolla","quantity_g":40,"kcal":16,"protein_g":0,"carbs_g":4,"fat_g":0},{"name":"Cilantro fresco","quantity_g":10,"kcal":2,"protein_g":0,"carbs_g":0,"fat_g":0}]',
 '1. Condimenta el pollo con comino, ajo y sal. Cocina a la plancha.\n2. Desmenuza el pollo.\n3. Pica jitomate, cebolla y cilantro para el pico de gallo.\n4. Calienta las tortillas. Arma los tacos.',
 ARRAY['alto-proteina','tipico-mexico'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Smoothie verde proteico',
 'Energizante y llenador para antes del gym.',
 'snack', 1, 5, 290, 25, 32, 6, 5,
 '[{"name":"Espinaca cruda","quantity_g":60,"kcal":14,"protein_g":2,"carbs_g":2,"fat_g":0},{"name":"Plátano","quantity_g":100,"kcal":89,"protein_g":1,"carbs_g":23,"fat_g":0},{"name":"Proteína whey vainilla","quantity_g":30,"kcal":111,"protein_g":21,"carbs_g":4,"fat_g":2},{"name":"Leche de almendra sin azucar","quantity_g":240,"kcal":36,"protein_g":1,"carbs_g":1,"fat_g":3},{"name":"Semillas de chía","quantity_g":15,"kcal":73,"protein_g":2,"carbs_g":6,"fat_g":5}]',
 '1. Pon todos los ingredientes en la licuadora.\n2. Licúa 45 segundos hasta que quede suave.\n3. Sirve inmediatamente.',
 ARRAY['rapido','pre-entreno','alto-proteina'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Frijoles negros con arroz integral',
 'Combo perfecto de proteína vegetal completa.',
 'comida', 1, 10, 380, 18, 65, 4, 14,
 '[{"name":"Frijoles negros cocidos","quantity_g":172,"kcal":227,"protein_g":15,"carbs_g":41,"fat_g":1},{"name":"Arroz integral cocido","quantity_g":150,"kcal":168,"protein_g":4,"carbs_g":35,"fat_g":1},{"name":"Cebolla","quantity_g":50,"kcal":20,"protein_g":0,"carbs_g":5,"fat_g":0},{"name":"Aceite de oliva","quantity_g":5,"kcal":44,"protein_g":0,"carbs_g":0,"fat_g":5}]',
 '1. Saltea la cebolla picada en aceite 3 min.\n2. Agrega los frijoles y sazona con sal, comino y epazote.\n3. Sirve sobre el arroz integral.',
 ARRAY['vegano','alto-fibra','economico'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Yogur griego con granola y miel',
 'Snack alto en proteína, listo en 2 minutos.',
 'snack', 1, 2, 310, 18, 38, 8, 2,
 '[{"name":"Yogur griego sin azúcar","quantity_g":200,"kcal":194,"protein_g":18,"carbs_g":7,"fat_g":10},{"name":"Granola sin azúcar","quantity_g":40,"kcal":188,"protein_g":4,"carbs_g":26,"fat_g":8},{"name":"Miel de abeja","quantity_g":15,"kcal":46,"protein_g":0,"carbs_g":12,"fat_g":0}]',
 '1. Sirve el yogur griego en un bowl.\n2. Añade la granola encima.\n3. Vierte la miel al gusto.',
 ARRAY['rapido','alto-proteina','snack'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Salmón al limón con camote',
 'Rico en omega-3, perfecto para recuperación.',
 'cena', 1, 30, 490, 38, 35, 16, 5,
 '[{"name":"Salmón Atlántico","quantity_g":180,"kcal":374,"protein_g":37,"carbs_g":0,"fat_g":24},{"name":"Camote","quantity_g":150,"kcal":129,"protein_g":2,"carbs_g":30,"fat_g":0},{"name":"Limón","quantity_g":20,"kcal":6,"protein_g":0,"carbs_g":2,"fat_g":0},{"name":"Aceite de oliva extra virgen","quantity_g":10,"kcal":88,"protein_g":0,"carbs_g":0,"fat_g":10}]',
 '1. Precalienta el horno a 200°C.\n2. Corta el camote en rodajas, hornea 20 min.\n3. Unta el salmón con aceite, limón, sal y pimienta.\n4. Hornea el salmón 12-15 min. Sirve juntos.',
 ARRAY['omega3','sin-gluten','alto-proteina'], true),

('00000000-0000-0000-0000-000000000000'::uuid,
 'Licuado de proteína con cacahuate',
 'Post-entrenamiento rápido y delicioso.',
 'snack', 1, 3, 430, 35, 30, 16, 3,
 '[{"name":"Proteína whey chocolate","quantity_g":30,"kcal":113,"protein_g":20,"carbs_g":5,"fat_g":2},{"name":"Mantequilla de cacahuate","quantity_g":30,"kcal":176,"protein_g":8,"carbs_g":6,"fat_g":15},{"name":"Plátano","quantity_g":100,"kcal":89,"protein_g":1,"carbs_g":23,"fat_g":0},{"name":"Leche descremada","quantity_g":240,"kcal":82,"protein_g":8,"carbs_g":12,"fat_g":0}]',
 '1. Pon todos los ingredientes en la licuadora con hielo.\n2. Licúa hasta obtener consistencia cremosa.\n3. Consume inmediatamente después del entrenamiento.',
 ARRAY['post-entreno','alto-proteina','rapido'], true)

on conflict do nothing;
