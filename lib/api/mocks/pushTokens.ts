// Mock push token endpoints. Re-exports the implementations from identity.ts so the
// wrapper modules can keep their per-group import paths clean.

export { registerPushToken, deletePushToken } from './identity';
