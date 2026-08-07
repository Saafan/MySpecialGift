declare module "earcut" {
  // Babylon's ExtrudePolygon takes the earcut function as its injector argument.
  const earcut: (
    vertices: number[],
    holes?: number[],
    dimensions?: number,
  ) => number[];
  export default earcut;
}
