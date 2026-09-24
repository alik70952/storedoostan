// هوک حل ماژول برای اجرای فایل‌های TS پروژه (src/lib/*.ts) با Node خالی.
// پروژه از ایمپورت‌های بدون پسوند ("./types") استفاده می‌کند که در ESM استاندارد
// پیدا نمی‌شوند؛ این هوک همان مسیر را با پسوند .ts دوباره امتحان می‌کند.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".") && !/\.(m?js|cjs|json|ts|tsx|node)$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
