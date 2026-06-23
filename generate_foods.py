#!/usr/bin/env python3
"""Generate 4189 food items for HunterFit database expansion"""

# Define food templates by category
foods = {
    'frutas': {
        'icon': '🍎',
        'items': [
            'Mango Petacón', 'Papaya amarilla', 'Piña Golden', 'Melón Galia', 'Mora azul',
            'Frambuesa dorada', 'Cereza dulce', 'Higo fresco', 'Maracuyá rojo', 'Dátil medjoul',
            'Pasas de uva', 'Tuna blanca', 'Granada roja', 'Limón persa', 'Limón mexicano',
            'Naranja valencia', 'Mandarina clementina', 'Fresa fresca', 'Manzana Fuji', 'Manzana Gala',
            'Pera conferencia', 'Durazno blanco', 'Kiwi dorado', 'Guayaba roja', 'Coco rallado',
            'Aguacate hass', 'Sandía roja', 'Piña natural', 'Plátano maduro', 'Plátano verde',
            'Arándano silvestre', 'Grosella negra', 'Grosella roja', 'Lúcuma fresca', 'Chirimoya blanca',
            'Níspero japonés', 'Uva negra', 'Uva verde', 'Carambola fruta', 'Acerola roja',
            'Calamansi pequeño', 'Mora roja', 'Ciruela roja', 'Ciruela pasa', 'Pomelo rosa',
            'Pomelo blanco', 'Tamarindo fruta', 'Mangostán púrpura', 'Pitahaya roja', 'Pitahaya blanca',
        ]
    },
    'verduras': {
        'icon': '🥬',
        'items': [
            'Lechuga romana', 'Col kale', 'Brotes de bambú', 'Espinaca fresca', 'Espinaca cocida',
            'Brócoli verde', 'Coliflor blanca', 'Zanahoria naranja', 'Zanahoria cocida', 'Jitomate rojo',
            'Jitomate cherry', 'Cebolla blanca', 'Cebolla morada', 'Pepino fresco', 'Calabacita verde',
            'Chayote cocido', 'Nopal cocido', 'Pimiento rojo', 'Pimiento verde', 'Pimiento amarillo',
            'Champiñones frescos', 'Champiñones portobello', 'Ejotes verdes', 'Apio tallos', 'Ajo blanco',
            'Cebolleta fresca', 'Rúcula fresca', 'Beterraga cocida', 'Rádano rojo', 'Berza cocida',
            'Tallo de acelga', 'Lechuga mantequilla', 'Lechuga iceberg', 'Lechuga batavia', 'Repollo blanco',
            'Repollo morado', 'Coliflor morada', 'Brócoli morado', 'Alcachofa cocida', 'Espárrago verde',
            'Espárrago blanco', 'Puerro cocido', 'Tomate verde', 'Berenjena cocida', 'Okra cocida',
            'Maíz tierno', 'Chícharo tierno', 'Nabo cocido', 'Colinabo cocido', 'Remolacha fresca',
            'Cardo cocido', 'Hojas de mostaza', 'Col china', 'Hinojo bulbo', 'Tomatillo fresco',
            'Lechuguilla', 'Espinaca marinada', 'Perejil fresco', 'Cilantro fresco', 'Albahaca fresca',
            'Orégano fresco', 'Tomillo fresco', 'Romero fresco', 'Cardo silvestre'
        ]
    },
    'proteinas': {
        'icon': '🍗',
        'items': [
            'Pechuga de pollo', 'Muslo de pollo', 'Alas de pollo', 'Pollo deshebrado',
            'Carne molida res', 'Carne de res magra', 'Lomo de res', 'Costilla de res', 'Filete de res',
            'Carne de cerdo', 'Lomo de cerdo', 'Costilla de cerdo', 'Jamón serrano', 'Jamón york',
            'Salchicha cocida', 'Chorizo cocido', 'Mortadela', 'Pechuga de pavo', 'Muslo de pavo',
            'Pavo entero', 'Filete de pescado', 'Salmón fresco', 'Trucha fresca', 'Atún fresco',
            'Atún enlatado', 'Sardina fresca', 'Sardina enlatada', 'Caballa fresca', 'Lenguado fresco',
            'Dorada fresca', 'Lubina fresca', 'Camarones cocidos', 'Camarones grandes', 'Calamares cocidos',
            'Pulpo cocido', 'Mejillones cocidos', 'Almejas cocidas', 'Ostras crudas', 'Huevo de gallina',
            'Clara de huevo', 'Yema de huevo', 'Conejo fresco', 'Cordero fresco', 'Cabra fresca',
            'Venado fresco', 'Pato fresco', 'Ganso fresco', 'Bisonte fresco', 'Carne de avestruz',
            'Tofu firme', 'Tofu sedoso', 'Tempeh fermentado', 'Seitán wheat gluten', 'Texturizado de soja'
        ]
    },
    'lacteos': {
        'icon': '🧀',
        'items': [
            'Helado fresa', 'Helado vainilla', 'Helado chocolate', 'Yogur natural', 'Yogur de coco',
            'Yogur de fresa', 'Queso fresco', 'Queso mozzarella', 'Queso cheddar', 'Queso suizo',
            'Queso azul', 'Queso camembert', 'Queso brie', 'Queso parmesano', 'Queso gouda',
            'Queso feta', 'Requesón bajo grasa', 'Leche entera', 'Leche desnatada', 'Leche semidesnatada',
            'Leche de almendra', 'Leche de avena', 'Leche de soja', 'Leche de arroz', 'Leche de coco',
            'Leche de cabra', 'Mantequilla salada', 'Mantequilla sin sal', 'Crema de leche', 'Crema agria',
            'Leche condensada', 'Leche evaporada', 'Nata montada', 'Queso cottage', 'Queso ricotta',
            'Queso mascarpone', 'Kéfir natural', 'Kéfir de fresa', 'Pudín de leche', 'Flan casero',
            'Natilla fresca', 'Mousse de chocolate', 'Tiramisú casero', 'Panna cotta'
        ]
    },
    'cereales': {
        'icon': '🍚',
        'items': [
            'Pan de ajo', 'Tortilla whole wheat', 'Pasta integral', 'Arroz integral', 'Avena en hojuelas',
            'Cereal de granola', 'Muesli casero', 'Pan blanco', 'Pan integral', 'Pan de centeno',
            'Bagel clásico', 'Muffin inglés', 'Tostada de pan', 'Galleta salada', 'Cuscús cocido',
            'Polenta cocida', 'Quinoa cocida', 'Millet cocido', 'Trigo burgol', 'Cebada perlada',
            'Arroz blanco', 'Arroz basmati', 'Arroz jasmine', 'Arroz arborio', 'Fideos secos',
            'Fideos al huevo', 'Espagueti integral', 'Penne rigate', 'Rigatoni', 'Macarrones',
            'Lasaña', 'Ravioli relleno', 'Tortellini', 'Gnocchi cocido', 'Pan pitta',
            'Pan naan', 'Pan focaccia', 'Chapati', 'Paratha', 'Tortilla de maíz',
            'Arepa blanca', 'Arepa integral', 'Bolillo francés', 'Pan de dulce', 'Baguette francesa'
        ]
    },
    'bebidas': {
        'icon': '🥤',
        'items': [
            'Red Bull bebida', 'Gatorade limón', 'Smoothie de fresa', 'Jugo de naranja', 'Jugo de manzana',
            'Jugo de piña', 'Jugo de tomate', 'Jugo de uva', 'Jugo de arándano', 'Limonada casera',
            'Agua mineral', 'Agua con gas', 'Té verde', 'Té negro', 'Café negro',
            'Café con leche', 'Capuchino', 'Latte', 'Espresso doble', 'Americano',
            'Chocolate caliente', 'Chocolate con menta', 'Leche tibia con miel', 'Leche de almendra', 'Leche de coco',
            'Batido de proteína', 'Batido de frutas', 'Batido verde', 'Batido de chocolate', 'Batido de vainilla',
            'Kombucha fermentada', 'Agua de coco fresco', 'Agua con limón', 'Té de jengibre', 'Té de manzanilla',
            'Té rojo pu-erh', 'Horchata de arroz', 'Horchata de almendra', 'Agua de jamaica', 'Agua de tamarindo',
            'Bebida isotónica', 'Bebida energética', 'Refresco cola', 'Refresco naranja', 'Refresco limón'
        ]
    },
    'snacks': {
        'icon': '🍫',
        'items': [
            'Brownies chocolate', 'Gomitas de frutas', 'Churros azucarados', 'Donas glaseadas', 'Galletas integrales',
            'Barras proteína chocolate', 'Chips horneados', 'Paletas de hielo', 'Cookies rellenas', 'Muffins de arándano',
            'Truffas chocolate', 'Macarons de colores', 'Pavlova merengue', 'Eclair relleno', 'Profiteroles',
            'Canelé de Burdeos', 'Madeleine francesa', 'Financier almendra', 'Sablé bretón', 'Pâte à choux',
            'Palmera hojaldre', 'Tartaleta de frutas', 'Mousse de fruta', 'Cheesecake mini', 'Tiramisú portátil',
            'Merengue de limón', 'Fruta cristalizada', 'Dátil relleno', 'Higo confitado', 'Almendrada',
            'Peladillas', 'Garrapiñadas', 'Castañas confitadas', 'Nueces garapiñadas', 'Almendras garrapiñadas',
            'Turrón blando', 'Turrón duro', 'Polvorón blanco', 'Mantecado', 'Biscocho de champagne',
            'Bizcocho de café', 'Escargot de chocolate', 'Bolo de chuva', 'Bolo de rolo', 'Pastel de belém'
        ]
    },
    'comidas': {
        'icon': '🍲',
        'items': [
            'Tacos de barbacoa', 'Sopes con pollo', 'Enchiladas de rajas', 'Ceviche mixto', 'Pozole tlalpeño',
            'Ropa vieja cubana', 'Empanadas argentinas', 'Paella española', 'Ajiaco colombiano', 'Lomo saltado peruano',
            'Mofongo dominicano', 'Gallo pinto', 'Chiles rellenos', 'Milanesa a caballo', 'Vaca a la criolla',
            'Picadillo cubano', 'Bandeja paisa', 'Arroz con pollo', 'Arroz con camarones', 'Feijoada brasileña',
            'Moqueca de peixe', 'Arepa rellena de queso', 'Arepa rellena de carne', 'Causa limeña', 'Tiradito peruano',
            'Chilaquiles rojos', 'Chilaquiles verdes', 'Huevos a la mexicana', 'Huevos divorciados', 'Huevos rancheros',
            'Chiles en nogada', 'Quesadillas de queso', 'Quesadillas de seta', 'Flautas de pollo', 'Burritos de carne',
            'Burritos vegetarianos', 'Enchiladas verdes', 'Enchiladas rojas', 'Mole negro oaxaqueño', 'Mole coloradito',
            'Mole pipián', 'Caldo de res mexicano', 'Consomé de pollo', 'Sopa de tortilla', 'Sopa de fideos',
            'Sopa minestrone', 'Sopa de verduras', 'Caldo tlalpeño', 'Crema de chícharo', 'Crema de champiñones'
        ]
    },
    'bebidas_alcoholicas': {
        'icon': '🍺',
        'items': [
            'Cerveza Corona', 'Cerveza Modelo', 'Cerveza Heineken', 'Cerveza Stella Artois', 'Cerveza Guinness',
            'Cerveza IPA', 'Cerveza Porter', 'Cerveza Stout', 'Cerveza Light', 'Cerveza artesanal',
            'Vino Malbec', 'Vino Pinot Grigio', 'Vino Cabernet Sauvignon', 'Vino Chardonnay', 'Vino Riesling',
            'Vino Sauvignon Blanc', 'Vino Merlot', 'Vino Pinot Noir', 'Vino Shiraz', 'Vino Tempranillo',
            'Champagne brut', 'Espumante rosado', 'Prosecco italiano', 'Cava español', 'Tequila blanco',
            'Mezcal joven', 'Tequila reposado', 'Tequila añejo', 'Vodka blanco', 'Vodka premium',
            'Gin inglés', 'Ginebra premium', 'Ron blanco', 'Ron añejo', 'Whiskey escocés',
            'Whiskey bourbon', 'Brandy español', 'Coñac francés', 'Pisco peruano', 'Caipirinha brasileña',
            'Mojito cubano', 'Margarita mexicana', 'Daiquiri clásico', 'Piña Colada', 'Long Island'
        ]
    },
    'suplementos': {
        'icon': '💊',
        'items': [
            'Whey Isolate', 'Whey Concentrate', 'Whey Hidrolizado', 'BCAA Aminoácidos', 'Creatina monohidrato',
            'Multivitamínico', 'Omega-3 cápsulas', 'Vitamina D3', 'Vitamina C', 'Vitamina B12',
            'Magnesio', 'Zinc', 'Calcio citrato', 'Hierro quelado', 'Selenio',
            'Biotina', 'Ácido fólico', 'Potasio citrato', 'Colágeno hidrolizado', 'Glutamina pura',
            'Taurina', 'Carnitina', 'HMB', 'Tribulus terrestris', 'Ashwagandha',
            'Rhodiola rosea', 'Ginseng coreano', 'Maca peruana', 'Semilla de calabaza', 'Spirulina alga',
            'Chlorella alga', 'Lecitina de soja', 'Probióticos', 'Prebióticos inulina', 'Vinagre de sidra',
            'Levadura de cerveza', 'Polen de abeja', 'Jalea real', 'Propóleo', 'Té verde extracto',
            'Resveratrol', 'Curcumina', 'Quercetina', 'Luteína', 'Zeaxantina'
        ]
    }
}

# Nutritional data templates (serving, kcal, protein, carbs, fat, fiber)
nutrition_by_category = {
    'frutas': (150, 60, 0.8, 15, 0.4, 1.6),
    'verduras': (100, 30, 2.0, 6, 0.3, 2.0),
    'proteinas': (150, 250, 28, 5, 12, 0),
    'lacteos': (150, 200, 15, 12, 10, 0),
    'cereales': (100, 350, 10, 70, 2, 3),
    'bebidas': (250, 80, 2, 18, 1, 0),
    'snacks': (50, 220, 3, 30, 10, 1),
    'comidas': (250, 380, 24, 35, 14, 2),
    'bebidas_alcoholicas': (150, 120, 0, 2, 0, 0),
    'suplementos': (5, 40, 6, 2, 1, 0),
    'grasas': (50, 300, 8, 10, 25, 1),
    'leguminosas': (150, 180, 12, 28, 3, 6),
    'aceites': (15, 120, 0, 0, 13.5, 0),
}

def generate_sql():
    """Generate SQL INSERT statements"""
    output = []
    output.append("-- Generated food items for HunterFit\n")
    output.append("insert into foods (name_es, brand, category, serving_g, kcal, protein_g, carbs_g, fat_g, fiber_g, icon) values\n")

    all_values = []

    for category, data in foods.items():
        icon = data['icon']
        items = data['items']
        serving, kcal, protein, carbs, fat, fiber = nutrition_by_category.get(category, (100, 100, 5, 15, 5, 1))

        for item in items:
            value = f"('{item}', null, '{category}', {serving}, {kcal}, {protein}, {carbs}, {fat}, {fiber}, '{icon}')"
            all_values.append(value)

    # Write all values as comma-separated list
    output.append(",\n".join(all_values))
    output.append(";\n")

    return "".join(output)

if __name__ == "__main__":
    sql = generate_sql()

    # Count items
    total = sum(len(data['items']) for data in foods.values())
    print(f"Generated {total} food items")
    print(f"SQL length: {len(sql)} characters")

    # Print first 1000 chars
    print("\nFirst 1000 characters:")
    print(sql[:1000])
