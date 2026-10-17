export const GARDEN_SIZE = { cols: 6, rows: 4 } as const;
export type GardenPlot = { col: number; row: number };
export const GARDEN_PLOTS: GardenPlot[] = Array.from({ length: GARDEN_SIZE.cols * GARDEN_SIZE.rows }, (_, i) => ({
  col: i % GARDEN_SIZE.cols, row: Math.floor(i / GARDEN_SIZE.cols),
}));
export const plotNumber = (plot: GardenPlot) => plot.row * GARDEN_SIZE.cols + plot.col + 1;
