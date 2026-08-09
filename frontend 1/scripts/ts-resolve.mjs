// Node resuelve ESM con extension explicita; el codigo de la app usa las rutas
// sin extension que espera el bundler. Este hook cierra esa diferencia para que
// `node --test` pueda correr los modulos de lib/ tal como estan escritos.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/\.[mc]?[jt]sx?$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        // No era un .ts: seguimos con la resolucion normal.
      }
    }
    return next(specifier, context);
  },
});
