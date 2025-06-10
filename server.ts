import { serve } from "bun";

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve index.html for root path
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("./index.html");
      return new Response(file, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }
    
    // Handle favicon
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }
    
    // Transpile and serve TypeScript files
    if (url.pathname.endsWith(".ts")) {
      const filePath = "." + url.pathname;
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const transpiler = new Bun.Transpiler({
          loader: "ts",
          target: "browser",
          format: "esm",
          minifyWhitespace: false,
          minifyIdentifiers: false,
          minifySyntax: false,
        });
        const code = await file.text();
        
        // TypeScriptの相対インポートを処理
        let result = await transpiler.transform(code);
        
        // .js拡張子を.tsに変換（開発サーバー用）
        result = result.replace(/from\s+['"](\..*?)\.js['"];/g, "from '$1.ts';");
        result = result.replace(/import\s+['"](\..*?)\.js['"];/g, "import '$1.ts';");
        
        return new Response(result, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          },
        });
      }
    }
    
    // Serve CSS files
    if (url.pathname.endsWith(".css")) {
      const file = Bun.file("." + url.pathname);
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "Content-Type": "text/css",
          },
        });
      }
    }
    
    // Serve node_modules files
    if (url.pathname.startsWith("/node_modules/")) {
      const file = Bun.file("." + url.pathname);
      if (await file.exists()) {
        let contentType = "application/javascript";
        if (url.pathname.endsWith(".css")) {
          contentType = "text/css";
        } else if (url.pathname.endsWith(".json")) {
          contentType = "application/json";
        }
        return new Response(file, {
          headers: {
            "Content-Type": contentType,
          },
        });
      }
    }
    
    // Serve other static files
    const file = Bun.file("." + url.pathname);
    if (await file.exists()) {
      return new Response(file);
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);