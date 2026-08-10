import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const appRoot = __dirname;
loadEnvConfig(appRoot);
loadEnvConfig(path.join(appRoot, ".."));

const nextConfig: NextConfig = {};

export default nextConfig;
