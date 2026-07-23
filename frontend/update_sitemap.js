const fs = require('fs');

const path = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/app/sitemap.ts';
let code = fs.readFileSync(path, 'utf8');

const replacements = [
  {
    regex: /async function getBlogs\(\) \{\s*const res = await fetch\([\s\S]*?\);\s*if \(!res\.ok\) throw new Error\("Failed to fetch blogs"\);\s*const data = await res\.json\(\);\s*return data\.data;\s*\}/,
    replacement: `async function getBlogs() {
  try {
    const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/blogs/?status=published\`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    return [];
  }
}`
  },
  {
    regex: /async function getNews\(\) \{\s*const res = await fetch\([\s\S]*?\);\s*if \(!res\.ok\) throw new Error\("Failed to fetch news"\);\s*const data = await res\.json\(\);\s*return data\.data;\s*\}/,
    replacement: `async function getNews() {
  try {
    const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/news/?status=published\`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    return [];
  }
}`
  },
  {
    regex: /async function getCategory\(\) \{\s*const res = await fetch\([\s\S]*?\);\s*if \(!res\.ok\) throw new Error\("Failed to fetch posts"\);\s*return res\.json\(\);\s*\}/,
    replacement: `async function getCategory() {
  try {
    const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/category\`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!res.ok) return { data: [] };
    return res.json();
  } catch (error) {
    return { data: [] };
  }
}`
  },
  {
    regex: /async function getPackages\(\) \{\s*const res = await fetch\([\s\S]*?\);\s*if \(!res\.ok\) throw new Error\("Failed to fetch packages"\);\s*const data = await res\.json\(\);\s*return data\?\.data;\s*\}/,
    replacement: `async function getPackages() {
  try {
    const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/packages/\`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch (error) {
    return [];
  }
}`
  },
  {
    regex: /async function getDestination\(\) \{\s*const res = await fetch\([\s\S]*?\);\s*if \(!res\.ok\) throw new Error\("Failed to fetch posts"\);\s*const data = await res\.json\(\);\s*return data\?\.data \?\? \[\];\s*\}/,
    replacement: `async function getDestination() {
  try {
    const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/destination\`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch (error) {
    return [];
  }
}`
  },
  {
    regex: /const getAllWebPage = async \(\) => \{\s*const res = await fetch\([\s\S]*?\);\s*if \(!res\.ok\) throw new Error\("Failed to fetch webpages"\);\s*const data = await res\.json\(\);\s*return data\?\.data \?\? \[\];\s*\};/,
    replacement: `const getAllWebPage = async () => {
  try {
    const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/webpage/?status=published\`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch (error) {
    return [];
  }
};`
  },
  {
    regex: /const getAllVisa = async \(\) => \{\s*const res = await fetch\([\s\S]*?\);\s*if \(!res\.ok\) throw new Error\("Failed to fetch Visa"\);\s*const data = await res\.json\(\);\s*return data\?\.data \?\? \[\];\s*\};/,
    replacement: `const getAllVisa = async () => {
  try {
    const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/visa\`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch (error) {
    return [];
  }
};`
  }
];

let hasError = false;
replacements.forEach(({ regex, replacement }, index) => {
  if (regex.test(code)) {
    code = code.replace(regex, replacement);
  } else {
    console.error(`Regex failed at index ${index}`);
    hasError = true;
  }
});

if (!hasError) {
  fs.writeFileSync(path, code);
  console.log('Successfully updated sitemap.ts');
}
