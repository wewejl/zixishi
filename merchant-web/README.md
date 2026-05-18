# 静谧空间商家 Web

独立的商家端 Web 前端，默认连接本仓库现有后端。

## 本地启动

先启动后端：

```sh
cd ../backend
npm run start
```

再启动商家 Web：

```sh
cd ../merchant-web
npm run dev
```

访问：

```text
http://localhost:5174
```

## 构建

```sh
npm run build
```

`scripts/run-vite.js` 会优先使用 `merchant-web/node_modules`，如果没有安装本目录依赖，会回退使用 `frontend/node_modules` 中已有的 Vite。
