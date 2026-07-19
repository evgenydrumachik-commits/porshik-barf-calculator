import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: rootDir,
  outputFileTracingIncludes: {
    "/": ["./index.html"]
  }
};

export default nextConfig;
