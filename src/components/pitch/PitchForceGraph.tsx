'use client'

/**
 * Thin re-export so PitchWeb can load the graph after mount.
 * next/dynamic does not forward refs, which broke zoom/pan controls.
 */
export { default } from 'react-force-graph-2d'
