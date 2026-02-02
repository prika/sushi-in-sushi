export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  pieces?: number;
  outOfStock?: boolean;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export const menuCircunvalacao: MenuCategory[] = [
  {
    name: "Entradas Quentes",
    items: [
      { name: "Sopa Missô", price: 4.5, description: "Sopa com missô, shimeji, cenoura, alho francês e alga wakame" },
      { name: "Aros de Lula", price: 3.5, pieces: 6, description: "Aros de lula panados" },
      { name: "Rolos Primavera Vegetal", price: 4.0, pieces: 6 },
      { name: "Rolos Primavera de Queijo", price: 4.0, pieces: 6 },
      { name: "Camarão Empanado", price: 6.0, pieces: 5 },
      { name: "Camarão ao Alho", price: 6.0, pieces: 6 },
      { name: "Shimeji", price: 5.5, description: "Cogumelos na manteiga com molho teriyaki" },
    ],
  },
  {
    name: "Entradas Frias",
    items: [
      { name: "Sunomono", price: 3.5, description: "Lâminas de pepino temperadas com molho su" },
      { name: "Ceviche de Salmão", price: 9.0, description: "Ceviche de salmão com citrinos e pimentos" },
      { name: "Tartar de Salmão", price: 9.0, description: "Tartar de salmão com raspa de limão" },
      { name: "Carpaccio de Salmão", price: 10.0, pieces: 10, description: "Fatias finas de salmão com alho crocante" },
    ],
  },
  {
    name: "Sashimi",
    items: [
      { name: "Sashimi Salmão", price: 2.5, pieces: 2 },
      { name: "Sashimi Atum", price: 2.5, pieces: 2 },
      { name: "Sashimi Peixe Branco", price: 2.5, pieces: 2 },
      { name: "Sashimi Mix", price: 12.0, pieces: 10 },
    ],
  },
  {
    name: "Nigiri",
    items: [
      { name: "Nigiri de Salmão", price: 2.5, pieces: 2 },
      { name: "Nigiri de Atum", price: 2.5, pieces: 2 },
      { name: "Nigiri Mix", price: 12.0, pieces: 10 },
    ],
  },
  {
    name: "Gunkan",
    items: [
      { name: "Gunkan Salmão Filadélfia", price: 5.0, pieces: 4, description: "Salmão com cream cheese" },
      { name: "Gunkan Crispy", price: 5.5, pieces: 4, description: "Salmão com queijo e vegetais crocantes" },
      { name: "Gunkan Salmão e Camarão", price: 6.0, pieces: 4 },
      { name: "Gunkan Salmão Braseado", price: 6.0, pieces: 4 },
      { name: "Gunkan Tropical", price: 5.5, pieces: 4, description: "Salmão com manga e abacate" },
      { name: "Gunkan com Morango", price: 6.0, pieces: 4 },
    ],
  },
  {
    name: "Hot Rolls",
    items: [
      { name: "Hot de Salmão", price: 7.0, pieces: 8, description: "Roll de salmão com cream cheese" },
      { name: "Hot Crispy Filadélfia", price: 8.5, pieces: 8, description: "Salmão com cobertura crocante" },
      { name: "Hot Lovers Filadélfia", price: 9.0, pieces: 8, description: "Paté de salmão com cream cheese" },
      { name: "Hot de Salmão Grande", price: 9.0, pieces: 16 },
      { name: "Combinado Hot", price: 12.5, pieces: 24, description: "Variedade de salmão e camarão" },
    ],
  },
  {
    name: "Temaki",
    items: [
      { name: "Temaki de Salmão Clássico", price: 6.5, pieces: 1 },
      { name: "Temaki de Salmão Filadélfia", price: 6.5, pieces: 1, description: "Salmão com cream cheese" },
      { name: "Temaki de Salmão Tropical", price: 6.5, pieces: 1, description: "Salmão com manga e abacate" },
      { name: "Temaki de Camarão Filadélfia", price: 6.5, pieces: 1 },
      { name: "Temaki Supremo Filadélfia", price: 7.0, pieces: 1, description: "Salmão e camarão empanado" },
      { name: "Temaki Hot", price: 9.0, pieces: 1, description: "Temaki frito com teriyaki" },
    ],
  },
  {
    name: "Poke",
    items: [
      { name: "Poke Salmão Clássico", price: 12.0, description: "Salmão com vegetais e teriyaki" },
      { name: "Poke Salmão Filadélfia", price: 12.0, description: "Variante com cream cheese" },
      { name: "Poke de Atum", price: 12.0 },
      { name: "Poke Vegan", price: 11.0, description: "Tomate, vegetais e verduras" },
      { name: "Poke do Chef", price: 16.0, description: "Especial do chef" },
    ],
  },
  {
    name: "Combinados Individuais",
    items: [
      { name: "SU", price: 13.0, pieces: 14, description: "Uramaki Filadélfia de salmão + Gunkan de salmão Filadélfia" },
      { name: "SHARI", price: 13.0, pieces: 16, description: "Uramaki, hossomaki, nigiri e sashimi de salmão" },
      { name: "FISH", price: 13.5, pieces: 16, description: "Seleção mista de frutos do mar" },
    ],
  },
  {
    name: "Combinados Quentes + Frios",
    items: [
      { name: "SÉSAMO", price: 14.5, pieces: 24 },
      { name: "GOHAN", price: 19.0, pieces: 32 },
      { name: "SHOYO", price: 34.0, pieces: 60 },
    ],
  },
  {
    name: "Combinados para Partilhar",
    items: [
      { name: "SALMON FUSION", price: 37.0, pieces: 58 },
      { name: "SALMON TUNA", price: 37.0, pieces: 58 },
      { name: "SALMON LOVERS", price: 43.0, pieces: 58 },
      { name: "DO MAR", price: 47.0, pieces: 60 },
    ],
  },
  {
    name: "Vegetariano",
    items: [
      { name: "Temaki Vegan", price: 6.0, pieces: 1, description: "Manga, pepino e abacate" },
      { name: "Hot Carrot Filadélfia", price: 6.0, pieces: 8, description: "Cenoura com cream cheese" },
      { name: "Hot Vegan", price: 6.0, pieces: 8, description: "Cenoura e couve" },
      { name: "Hossomaki Vegan", price: 9.5, pieces: 24, description: "Manga, pepino e tomate" },
      { name: "Combinado Vegetariano", price: 9.5, pieces: 20 },
    ],
  },
  {
    name: "Sobremesas",
    items: [
      { name: "Hot de Banana com Nutella", price: 5.0, pieces: 8 },
      { name: "Hot de Banana com Doce de Leite", price: 5.0, pieces: 8 },
      { name: "Hot de Banana Misto", price: 5.0, pieces: 8 },
    ],
  },
  {
    name: "Bebidas",
    items: [
      { name: "Refrigerantes", price: 2.5, description: "Coca-Cola, Sprite, sumos" },
      { name: "Sumo de Laranja Natural", price: 3.5 },
      { name: "Cerveja", price: 2.2, description: "A partir de" },
      { name: "Vinho (garrafa 750ml)", price: 9.0 },
      { name: "Cocktails", price: 5.5, description: "A partir de" },
      { name: "Café", price: 1.0 },
    ],
  },
];
