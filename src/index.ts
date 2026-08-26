export * from './schema/script'
export * from './schema/videoScript'
export * from './shared/toonMaterial'
export * from './studio/createStudioScene'
export * from './studio/createMonitor'
export * from './avatar/createAnnouncerAvatar'
export * from './avatar/lipsync'
export * from './avatar/idle'
export * from './reenactment/createReenactmentScene'
export * from './reenactment/patterns'
export * from './shared/keyframes'
export * from './telop/createTelop'
// Not './narration/pollyProvider' — that pulls in @aws-sdk/client-polly and
// belongs behind the separate './polly' entry point (see package.json
// "exports"), so importing the main package never implies a TTS dependency.
export * from './narration/provider'
