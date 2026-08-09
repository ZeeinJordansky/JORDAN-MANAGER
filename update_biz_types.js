import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const bizTypesStr = `
export const BIZ_TYPES = {
  1: { name: "Шиномонтажка", price: 250000, profit: 500, img: "https://images.unsplash.com/photo-1599256621730-5351f1e564d6?w=600" },
  2: { name: "Ларёк-кафе", price: 500000, profit: 1000, img: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600" },
  3: { name: "Парикмахерская", price: 750000, profit: 1500, img: "https://images.unsplash.com/photo-1521590832167-7bfcbaa6362d?w=600" },
  4: { name: "Кафе", price: 1000000, profit: 1850, img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600" },
  5: { name: "Ресторан быстрого питания", price: 1250000, profit: 2050, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600" },
  6: { name: "Сеть магазинов", price: 1800000, profit: 3000, img: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=600" },
  7: { name: "IT кампания", price: 5000000, profit: 5000, img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600" },
  8: { name: "Банк", price: 12000000, profit: 7000, img: "https://images.unsplash.com/photo-1501167733088-49fb79ac8bb8?w=600" },
  9: { name: "Ювелирный магазин", price: 25000000, profit: 12000, img: "https://images.unsplash.com/photo-1515562141207-7a48fb3ce270?w=600" },
  10: { name: "Казино", price: 50000000, profit: 20000, img: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=600" }
};
`;

if (!code.includes("export const BIZ_TYPES")) {
  code = code.replace("const cooldowns = new Map<number, number>();", "const cooldowns = new Map<number, number>();\n" + bizTypesStr);
}

fs.writeFileSync('server.ts', code);
