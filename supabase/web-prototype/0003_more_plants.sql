-- More plant species for the 3D garden (keep in sync with src/lib/economy.ts)
insert into shop_items (id, name, type, price, growth_days, sprite) values
  ('lavender_seed','Lavender seed','flower',35,4,'🪻'),
  ('tulip_bulb','Tulip bulb','flower',40,4,'🌷'),
  ('rose_bush','Rose bush','flower',70,6,'🌹'),
  ('cherry_sapling','Cherry blossom sapling','tree',120,8,'🌸')
on conflict (id) do nothing;
