import { Router } from "express";
import { SearchWikipediaQueryParams, GetRandomWikipediaQueryParams } from "@workspace/api-zod";

const router = Router();

const WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1";
const WIKIPEDIA_SEARCH_API = "https://en.wikipedia.org/w/api.php";

// Search Wikipedia
router.get("/avi/wikipedia/search", async (req, res) => {
  const parsed = SearchWikipediaQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing or invalid query" });
  }

  const { query } = parsed.data;

  try {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      format: "json",
      srlimit: "5",
      srprop: "snippet",
    });

    const response = await fetch(`${WIKIPEDIA_SEARCH_API}?${params}`);
    const data = await response.json() as {
      query?: {
        search?: Array<{ title: string; snippet: string; pageid: number }>
      }
    };

    const results = (data.query?.search ?? []).map((item) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>/g, ""), // strip HTML tags
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
    }));

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Wikipedia search failed");
    res.status(500).json({ error: "Wikipedia search failed" });
  }
});

// Get random Wikipedia article (optionally on a topic)
router.get("/avi/wikipedia/random", async (req, res) => {
  const parsed = GetRandomWikipediaQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { topic } = parsed.data;

  try {
    if (topic) {
      // Search for the topic and return a random result from top 10
      const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: topic,
        format: "json",
        srlimit: "10",
        srprop: "snippet",
      });

      const searchResp = await fetch(`${WIKIPEDIA_SEARCH_API}?${params}`);
      const searchData = await searchResp.json() as {
        query?: {
          search?: Array<{ title: string; snippet: string; pageid: number }>
        }
      };

      const results = searchData.query?.search ?? [];
      if (results.length === 0) {
        return res.status(404).json({ error: "No articles found for topic" });
      }

      // Pick a random article from the results
      const randomItem = results[Math.floor(Math.random() * results.length)];
      const summary = randomItem.snippet.replace(/<[^>]*>/g, "");

      return res.json({
        title: randomItem.title,
        summary,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(randomItem.title.replace(/ /g, "_"))}`,
      });
    } else {
      // Get a truly random Wikipedia article
      const response = await fetch(`${WIKIPEDIA_API}/page/random/summary`);
      const data = await response.json() as {
        title: string;
        extract: string;
        content_urls?: { desktop?: { page?: string } }
      };

      return res.json({
        title: data.title,
        summary: data.extract ?? "",
        url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
      });
    }
  } catch (err) {
    req.log.error({ err }, "Wikipedia random failed");
    res.status(500).json({ error: "Wikipedia request failed" });
  }
});

export default router;
