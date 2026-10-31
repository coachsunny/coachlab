import { onRequest } from "./functions/api/[[catchall]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // /api/* 轉發給 API handler
    if (url.pathname.startsWith("/api")) {
      return onRequest({ request, env, ctx });
    }

    // /admin 與 /admin/ 捷徑導向後台頁面 admin.html
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      const adminUrl = new URL(request.url);
      adminUrl.pathname = "/admin.html";
      return env && env.ASSETS
        ? env.ASSETS.fetch(new Request(adminUrl, request))
        : new Response("Admin Not Found", { status: 404 });
    }
    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
