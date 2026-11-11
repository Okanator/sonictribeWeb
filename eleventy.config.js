import markdownIt from "markdown-it";

const md = markdownIt({ html: true, breaks: true, linkify: true });

export default function (eleventyConfig) {
  // Static files copied as-is
  eleventyConfig.addPassthroughCopy({ "src/img": "img" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.png": "favicon.png" });
  eleventyConfig.addPassthroughCopy({ "src/audio": "audio" });

  // Collections (content edited in /admin)
  const sortBy = (key, dir = 1) => (a, b) =>
    (a.data[key] > b.data[key] ? 1 : a.data[key] < b.data[key] ? -1 : 0) * dir;

  eleventyConfig.addCollection("dosezki", (api) =>
    api.getFilteredByGlob("src/content/dosezki/*.md").sort(sortBy("razvrscanje", -1))
  );
  eleventyConfig.addCollection("videospoti", (api) =>
    api.getFilteredByGlob("src/content/videospoti/*.md").sort(sortBy("datum", -1))
  );
  eleventyConfig.addCollection("izdelki", (api) =>
    api.getFilteredByGlob("src/content/izdelki/*.md").sort(sortBy("vrstni_red", 1))
  );
  eleventyConfig.addCollection("izvajalci", (api) =>
    api.getFilteredByGlob("src/content/izvajalci/*.md").sort(sortBy("vrstni_red", 1))
  );

  eleventyConfig.addCollection("radio", (api) =>
    api
      .getFilteredByGlob("src/content/radio/*.md")
      .filter((p) => p.data.datoteka && p.data.aktivno !== false && p.data.trajanje > 0)
      .sort((a, b) => (a.fileSlug > b.fileSlug ? 1 : -1))
  );

  // Filters
  eleventyConfig.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  eleventyConfig.addFilter("head", (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : arr));
  eleventyConfig.addFilter("ytid", (url) => {
    if (!url) return "";
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : "";
  });
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
