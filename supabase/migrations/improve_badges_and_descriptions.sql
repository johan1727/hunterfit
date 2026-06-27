-- ── IMPROVE BADGE DESCRIPTIONS + ADD NEW BADGES ──────────────────────────────

-- Update existing badges with more epic descriptions
update hunterfit.badges set description_es = '¡Tu primer paso en la leyenda te espera!' where slug = 'first_workout';
update hunterfit.badges set description_es = 'Ya no eres novato — el hierro es tu aliado' where slug = 'workouts_10';
update hunterfit.badges set description_es = 'Decenas de batallas ganadas. Eres una bestia' where slug = 'workouts_50';
update hunterfit.badges set description_es = 'Cien entrenamientos. Eres una leyenda viviente' where slug = 'workouts_100';
update hunterfit.badges set description_es = 'Cien series en los libros. Disciplina pura' where slug = 'sets_100';
update hunterfit.badges set description_es = 'Diez toneladas de volumen. Fuerza monumental' where slug = 'volume_10k';

update hunterfit.badges set description_es = 'Tres días de consistencia. El momentum está de tu lado' where slug = 'streak_3';
update hunterfit.badges set description_es = 'Una semana de fuego ininterrumpido. Imparable' where slug = 'streak_7';
update hunterfit.badges set description_es = 'Treinta días. Ya no es suerte — es disciplina' where slug = 'streak_30';
update hunterfit.badges set description_es = 'Cien días de racha. Eres leyenda absoluta' where slug = 'streak_100';

update hunterfit.badges set description_es = 'El viaje de mil entrenamientos comienza con una comida' where slug = 'first_meal';
update hunterfit.badges set description_es = 'Una semana de nutritción impecable' where slug = 'meals_7days';
update hunterfit.badges set description_es = 'Treinta días de control total sobre tu nutrición' where slug = 'meals_30days';
update hunterfit.badges set description_es = 'Cinco recetas exploradas. Tu paleta se expande' where slug = 'recipes_5';

update hunterfit.badges set description_es = 'Nivel 5. Tu poder crece exponencialmente' where slug = 'level_5';
update hunterfit.badges set description_es = 'Nivel 10. Entre la élite de los cazadores' where slug = 'level_10';
update hunterfit.badges set description_es = 'Nivel 25. Maestría reconocida por todos' where slug = 'level_25';

update hunterfit.badges set description_es = '10k pasos. Tu movilidad te define' where slug = 'steps_10k';
update hunterfit.badges set description_es = '50k pasos acumulados. El explorador sin pausa' where slug = 'steps_50k';

update hunterfit.badges set description_es = 'Diez mejores cazadores del mundo te conocen' where slug = 'top_10';
update hunterfit.badges set description_es = 'Eres el número uno. La cima es tuya' where slug = 'top_1';

-- ── NEW BADGES: SOCIAL / EXPLORATION / RECOVERY ──────────────────────────────

-- Insert new badges (if not exist)
insert into hunterfit.badges (slug, name_es, description_es, icon, category, xp_reward, rarity) values
-- Social bonding
('friends_invite',     'Cazador social',        'Invita a 3 amigos a cazador',                   '👥',  'social',   100, 'common'),
('squad_complete',     'Escuadrón legendario',  'Forma un grupo de 5 cazadores activos',        '⚔️👥','social',   400, 'rare'),
-- Exploration & Discovery
('foods_50',           'Explorador culinario',  'Prueba 50 alimentos diferentes',                '🌍',  'nutrition',150, 'rare'),
('recipes_20',         'Maestro de recetas',    'Domina 20 recetas fit premium',                 '👨‍🍳','nutrition',300, 'rare'),
-- Recovery & Balance
('rest_day',           'Descanso estratégico',  'Completa un día de descanso activo',           '😴',  'recovery',  50, 'common'),
('water_tracker',      'Hidratado',             'Registra agua durante 7 días seguidos',         '💧',  'recovery', 100, 'common'),
('sleep_perfect',      'Buena noche',           'Registra 7+ horas de sueño 5 días seguidos',   '🌙',  'recovery', 150, 'rare'),
-- Consistency milestones
('month_perfect',      'Cazador imparable',     'Completa un mes sin faltar un día',            '📆',  'streak',   300, 'rare'),
('body_photo_log',     'Fotógrafo del cambio',  'Registra 10 fotos de progreso',                '📸',  'discovery',200, 'rare')
on conflict (slug) do nothing;
