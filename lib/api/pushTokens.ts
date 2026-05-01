// Push tokens. The endpoints live under /v1/identity/* but are exposed here as a
// dedicated module so the notifications layer has a focused import surface.

export { registerPushToken, deletePushToken } from './identity';
