// Decoupled navigation helper. The axios interceptor must not import expo-router
// directly (that would force a static dependency and complicate testing). The root
// layout calls setUnauthorizedHandler at startup to wire router.replace.

type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  handler = fn;
}

// Default behavior runs when no handler has been set: clear auth + tenant stores
// silently. The user-facing redirect happens only when the layout has wired a real
// handler.
export async function dispatchUnauthorized(): Promise<void> {
  // Lazy import avoids cycles: navigation -> stores -> navigation.
  const { useAuthStore } = await import('@/lib/store/authStore');
  const { useTenantStore } = await import('@/lib/store/tenantStore');
  await useAuthStore.getState().signOut();
  await useTenantStore.getState().clear();
  if (handler) handler();
}
