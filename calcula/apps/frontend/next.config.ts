import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  turbopack: {
    // Use the monorepo root (two levels up from apps/frontend) so it works on any machine
    root: path.resolve(__dirname, '..', '..')
  },
  // VisActor is canvas/DOM-only — keep it out of the SSR bundle entirely.
  // This is mutually exclusive with optimizePackageImports for the same packages
  // (Turbopack would otherwise try to transpile + externalize, which conflicts).
  serverExternalPackages: [
    '@visactor/react-vchart',
    '@visactor/react-vtable',
    '@visactor/vchart',
    '@visactor/vtable',
    '@visactor/vrender-core',
    '@visactor/vrender-kits',
    '@visactor/vrender-components'
  ]
};

export default nextConfig;
