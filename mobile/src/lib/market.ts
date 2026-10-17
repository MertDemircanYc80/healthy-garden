export const MARKET_ITEMS = [
  { id: "flower", name: "Daisy flower", icon: "🌼", price: 20, category: "Plants", description: "A little sunshine for your garden." },
  { id: "lavender", name: "Lavender", icon: "🪻", price: 35, category: "Plants", description: "Soft purple blooms and a moment of calm." },
  { id: "sunflower", name: "Sunflower", icon: "🌻", price: 50, category: "Plants", description: "A bright bloom that follows the sun." },
  { id: "tree", name: "Apple tree", icon: "🌳", price: 100, category: "Plants", description: "A small tree with room to grow." },
  { id: "fertilizer", name: "Fertilizer", icon: "🌱", price: 20, category: "Tools & supplies", description: "A little nourishment to keep in your shed." },
  { id: "watering_can", name: "Watering can", icon: "🚿", price: 50, category: "Tools & supplies", description: "Keep a watering can ready for your plants." },
] as const;

export type ItemId = (typeof MARKET_ITEMS)[number]["id"];
export type Inventory = Record<ItemId, number>;
export const STARTING_COINS = 460;
export const emptyInventory = (): Inventory => ({ flower: 0, lavender: 0, sunflower: 0, tree: 0, fertilizer: 0, watering_can: 0 });

export function purchase(coins: number, inventory: Inventory, id: ItemId) {
  const item = MARKET_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error("This item is not available.");
  if (coins < item.price) throw new Error("Not enough money.");
  if (!Number.isSafeInteger(inventory[id] + 1)) throw new Error("Your inventory is full for this item.");
  return { coins: coins - item.price, inventory: { ...inventory, [id]: inventory[id] + 1 } };
}
