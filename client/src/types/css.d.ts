declare module '*.module.css' {
  const classes: { [key: string]: string };
}

// אל תכריז על '*.css' כללי כדי לא להתנגש עם vite/client.d.ts
