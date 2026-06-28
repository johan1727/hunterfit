-- HunterFit — Seed: roster de personajes
insert into characters (slug, name, title, archetype, description_es, attributes, routine_bias, unlock_rank) values
('kael', 'Kael', 'El Cazador de Sombras', 'definicion',
 'Un cazador letal que se mueve entre las sombras. Su físico delgado y definido es pura funcionalidad: cada músculo tiene un propósito. Entrena con él si buscas definición, agilidad y un cuerpo de calistenia.',
 '{"str": 6, "agi": 9, "vit": 6, "sta": 8}',
 '{"strength": 0.45, "cardio": 0.40, "flexibility": 0.15}', 'E'),

('ragnar', 'Ragnar', 'El Berserker', 'masa',
 'Una montaña de músculo forjada en mil batallas. Ragnar no conoce el cardio ligero: solo el hierro pesado. Entrena con él si tu meta es ganar masa muscular y fuerza bruta.',
 '{"str": 10, "agi": 4, "vit": 9, "sta": 5}',
 '{"strength": 0.70, "cardio": 0.20, "flexibility": 0.10}', 'E'),

('yuki', 'Yuki', 'La Asesina Veloz', 'agilidad',
 'Nadie la ve venir. Yuki es velocidad pura: sprints, pliometría y un core de acero. Entrena con ella si quieres ser más rápido, explosivo y atlético.',
 '{"str": 5, "agi": 10, "vit": 5, "sta": 9}',
 '{"strength": 0.25, "cardio": 0.55, "flexibility": 0.20}', 'E'),

('ren', 'Maestro Ren', 'El Monje', 'movilidad',
 'La fuerza sin control no es nada. Ren domina su cuerpo por completo: movilidad, equilibrio y fuerza isométrica. Entrena con él si buscas flexibilidad, postura y control corporal.',
 '{"str": 7, "agi": 7, "vit": 8, "sta": 7}',
 '{"strength": 0.30, "cardio": 0.20, "flexibility": 0.50}', 'E'),

('aria', 'Aria', 'La Valquiria', 'fuerza',
 'Guerrera implacable de piernas poderosas y core indestructible. Su entrenamiento prioriza tren inferior y fuerza atlética. Entrena con ella si quieres glúteos, piernas y potencia real.',
 '{"str": 8, "agi": 7, "vit": 8, "sta": 7}',
 '{"strength": 0.60, "cardio": 0.25, "flexibility": 0.15}', 'E'),

('kenta', 'Kenta', 'El Novato Decidido', 'general',
 'Todos los héroes empiezan en el nivel 1. Kenta entrena todo el cuerpo con los básicos bien hechos. Entrena con él si estás empezando y quieres construir una base sólida sin lesionarte.',
 '{"str": 5, "agi": 5, "vit": 5, "sta": 5}',
 '{"strength": 0.40, "cardio": 0.35, "flexibility": 0.25}', 'E');
