import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // 警告メッセージに従い、トップレベルに配置を試みる
  // @ts-ignore - NextConfigの型定義が追いついていない可能性があるため
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
