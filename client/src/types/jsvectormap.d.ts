declare module "jsvectormap" {
  const JsVectorMap: new (options: Record<string, unknown>) => {
    destroy: () => void;
    reset: () => void;
  };

  export default JsVectorMap;
}

declare module "jsvectormap/dist/maps/world.js";
