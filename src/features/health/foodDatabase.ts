export interface Food {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// kcal/macros per typical portion
export const FOOD_DB: Food[] = [
  // Proteínas
  { name: "Pollo a la plancha (100g)", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Pechuga de pavo (100g)", kcal: 135, protein: 30, carbs: 0, fat: 1 },
  { name: "Ternera magra (100g)", kcal: 190, protein: 27, carbs: 0, fat: 9 },
  { name: "Cerdo magro (100g)", kcal: 145, protein: 26, carbs: 0, fat: 4 },
  { name: "Huevo entero (1 ud)", kcal: 78, protein: 6, carbs: 0.6, fat: 5 },
  { name: "Clara de huevo (1 ud)", kcal: 17, protein: 3.6, carbs: 0.2, fat: 0 },
  { name: "Atún natural (1 lata)", kcal: 90, protein: 22, carbs: 0, fat: 0.5 },
  { name: "Salmón (100g)", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Merluza (100g)", kcal: 90, protein: 18, carbs: 0, fat: 2 },
  { name: "Bacalao (100g)", kcal: 82, protein: 18, carbs: 0, fat: 0.7 },
  { name: "Gambas (100g)", kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { name: "Tofu (100g)", kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: "Lentejas cocidas (100g)", kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Garbanzos cocidos (100g)", kcal: 164, protein: 9, carbs: 27, fat: 2.6 },
  { name: "Judías cocidas (100g)", kcal: 127, protein: 8.7, carbs: 23, fat: 0.5 },

  // Lácteos
  { name: "Leche entera (250ml)", kcal: 150, protein: 8, carbs: 12, fat: 8 },
  { name: "Leche desnatada (250ml)", kcal: 85, protein: 8.5, carbs: 12, fat: 0.2 },
  { name: "Yogur natural (125g)", kcal: 75, protein: 4.5, carbs: 6, fat: 3.5 },
  { name: "Yogur griego (150g)", kcal: 150, protein: 15, carbs: 6, fat: 7 },
  { name: "Queso fresco (50g)", kcal: 87, protein: 6, carbs: 2, fat: 6 },
  { name: "Queso curado (30g)", kcal: 120, protein: 7.5, carbs: 0.3, fat: 10 },
  { name: "Mantequilla (1 cda, 10g)", kcal: 72, protein: 0.1, carbs: 0, fat: 8 },

  // Frutas
  { name: "Plátano (1 ud)", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Manzana (1 ud)", kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Pera (1 ud)", kcal: 100, protein: 0.6, carbs: 27, fat: 0.2 },
  { name: "Naranja (1 ud)", kcal: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  { name: "Mandarina (1 ud)", kcal: 47, protein: 0.7, carbs: 12, fat: 0.3 },
  { name: "Kiwi (1 ud)", kcal: 42, protein: 0.8, carbs: 10, fat: 0.4 },
  { name: "Fresas (100g)", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: "Arándanos (100g)", kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { name: "Uvas (100g)", kcal: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  { name: "Sandía (100g)", kcal: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { name: "Melón (100g)", kcal: 34, protein: 0.8, carbs: 8, fat: 0.2 },
  { name: "Piña (100g)", kcal: 50, protein: 0.5, carbs: 13, fat: 0.1 },
  { name: "Melocotón (1 ud)", kcal: 58, protein: 1.4, carbs: 14, fat: 0.4 },
  { name: "Cerezas (100g)", kcal: 63, protein: 1, carbs: 16, fat: 0.2 },
  { name: "Aguacate (1/2 ud)", kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { name: "Mango (100g)", kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 },

  // Verduras y hortalizas
  { name: "Tomate (1 ud)", kcal: 22, protein: 1.1, carbs: 4.8, fat: 0.2 },
  { name: "Tomate cherry (100g)", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: "Lechuga (100g)", kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  { name: "Espinacas (100g)", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Rúcula (50g)", kcal: 13, protein: 1.3, carbs: 1.8, fat: 0.3 },
  { name: "Pepino (100g)", kcal: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { name: "Pimiento rojo (100g)", kcal: 31, protein: 1, carbs: 6, fat: 0.3 },
  { name: "Pimiento verde (100g)", kcal: 20, protein: 0.9, carbs: 4.6, fat: 0.2 },
  { name: "Zanahoria (1 ud)", kcal: 30, protein: 0.7, carbs: 7, fat: 0.2 },
  { name: "Cebolla (100g)", kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  { name: "Ajo (1 diente)", kcal: 4, protein: 0.2, carbs: 1, fat: 0 },
  { name: "Brócoli (100g)", kcal: 35, protein: 2.4, carbs: 7, fat: 0.4 },
  { name: "Coliflor (100g)", kcal: 25, protein: 1.9, carbs: 5, fat: 0.3 },
  { name: "Calabacín (100g)", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  { name: "Berenjena (100g)", kcal: 25, protein: 1, carbs: 6, fat: 0.2 },
  { name: "Champiñones (100g)", kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  { name: "Espárragos (100g)", kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1 },
  { name: "Judías verdes (100g)", kcal: 31, protein: 1.8, carbs: 7, fat: 0.2 },
  { name: "Maíz cocido (100g)", kcal: 96, protein: 3.4, carbs: 21, fat: 1.5 },
  { name: "Guisantes cocidos (100g)", kcal: 84, protein: 5.4, carbs: 14, fat: 0.4 },
  { name: "Patata cocida (100g)", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { name: "Boniato cocido (100g)", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },

  // Cereales y panes
  { name: "Arroz blanco cocido (100g)", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Arroz integral (100g)", kcal: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: "Pasta cocida (100g)", kcal: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { name: "Pasta integral cocida (100g)", kcal: 124, protein: 5, carbs: 27, fat: 1 },
  { name: "Quinoa cocida (100g)", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: "Avena (50g)", kcal: 190, protein: 6.5, carbs: 33, fat: 3.5 },
  { name: "Pan blanco (1 rebanada)", kcal: 75, protein: 2.5, carbs: 14, fat: 1 },
  { name: "Pan integral (1 rebanada)", kcal: 80, protein: 4, carbs: 14, fat: 1 },
  { name: "Tostada con tomate y aceite", kcal: 150, protein: 3, carbs: 20, fat: 6 },
  { name: "Cereales de desayuno (40g)", kcal: 150, protein: 3, carbs: 32, fat: 1.5 },
  { name: "Galletas María (4 ud)", kcal: 120, protein: 2, carbs: 20, fat: 3.5 },

  // Frutos secos y semillas
  { name: "Almendras (30g)", kcal: 174, protein: 6, carbs: 6, fat: 15 },
  { name: "Nueces (30g)", kcal: 196, protein: 4.5, carbs: 4, fat: 19.5 },
  { name: "Avellanas (30g)", kcal: 188, protein: 4.5, carbs: 5, fat: 18 },
  { name: "Pistachos (30g)", kcal: 170, protein: 6, carbs: 8, fat: 13 },
  { name: "Cacahuetes (30g)", kcal: 170, protein: 7.5, carbs: 5, fat: 14 },
  { name: "Semillas de chía (15g)", kcal: 73, protein: 2.5, carbs: 6, fat: 4.6 },

  // Grasas y aceites
  { name: "Aceite de oliva (1 cda)", kcal: 120, protein: 0, carbs: 0, fat: 14 },
  { name: "Aceite de girasol (1 cda)", kcal: 120, protein: 0, carbs: 0, fat: 14 },
  { name: "Mayonesa (1 cda)", kcal: 90, protein: 0.1, carbs: 0.5, fat: 10 },

  // Bebidas
  { name: "Café solo", kcal: 2, protein: 0.3, carbs: 0, fat: 0 },
  { name: "Café con leche", kcal: 60, protein: 3, carbs: 5, fat: 3 },
  { name: "Té (1 taza)", kcal: 2, protein: 0, carbs: 0.5, fat: 0 },
  { name: "Zumo de naranja (200ml)", kcal: 90, protein: 1.4, carbs: 21, fat: 0.4 },
  { name: "Refresco cola (330ml)", kcal: 140, protein: 0, carbs: 35, fat: 0 },
  { name: "Cerveza (1 caña)", kcal: 90, protein: 1, carbs: 7, fat: 0 },
  { name: "Vino tinto (1 copa)", kcal: 125, protein: 0.1, carbs: 4, fat: 0 },

  // Comidas preparadas / snacks
  { name: "Pizza (1 porción)", kcal: 285, protein: 12, carbs: 36, fat: 10 },
  { name: "Hamburguesa", kcal: 540, protein: 25, carbs: 40, fat: 28 },
  { name: "Bocadillo de jamón", kcal: 350, protein: 18, carbs: 45, fat: 10 },
  { name: "Ensalada mixta", kcal: 120, protein: 3, carbs: 10, fat: 8 },
  { name: "Sushi (8 piezas)", kcal: 300, protein: 9, carbs: 55, fat: 5 },
  { name: "Patatas fritas (100g)", kcal: 312, protein: 3.4, carbs: 41, fat: 15 },
  { name: "Chocolate negro (30g)", kcal: 170, protein: 2, carbs: 13, fat: 12 },
  { name: "Chocolate con leche (30g)", kcal: 160, protein: 2.3, carbs: 17, fat: 9 },
  { name: "Helado vainilla (100g)", kcal: 207, protein: 3.5, carbs: 24, fat: 11 },
  { name: "Croissant (1 ud)", kcal: 230, protein: 5, carbs: 26, fat: 12 },
  { name: "Magdalena (1 ud)", kcal: 180, protein: 3, carbs: 22, fat: 9 },
  { name: "Miel (1 cda)", kcal: 64, protein: 0.1, carbs: 17, fat: 0 },
];

export const ACTIVITY_PRESETS = {
  gym: { type: "Gimnasio", kcal: 450 },
  boxing: { type: "Boxeo", kcal: 600 },
};
