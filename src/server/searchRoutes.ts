import express from "express";
import type { NewsArticle } from "../types";
import { serverCorpus } from "./corpus";
import { smartSearch, SearchUtils } from "../utils/smartSearch";

export function registerSearchRoutes(app: express.Express): void {
  // 智能搜索端点
  app.get("/api/search", (req, res) => {
    try {
      const query = String(req.query.q || "").trim();
      const limit = Number(req.query.limit || 20);
      const offset = Number(req.query.offset || 0);
      
      if (!query) {
        return res.json({ 
          results: [], 
          total: 0, 
          suggestions: [] 
        });
      }

      const articles = serverCorpus as NewsArticle[];
      
      // 执行智能搜索
      const hits = smartSearch(query, articles, articles.length);
      
      const total = hits.length;
      const paginated = hits.slice(offset, offset + limit);
      
      // 生成同义词建议
      const suggestions = SearchUtils.fuzzyMatch(
        query,
        articles.map(a => a.title || "").filter(Boolean)
      ).slice(0, 5);

      res.json({
        results: paginated.map(h => {
          const article = articles.find(a => a.id === h.articleId);
          if (!article) return null;
          return {
            ...h,
            articleId: article.id,
            title: article.title,
            summary: article.summary,
            source: article.sourceName,
            publishedAt: article.publishedAt,
            tags: article.tags,
            keywords: SearchUtils.extractKeywords(query),
            score: h.score,
            highlights: h.highlights,
          };
        }).filter(Boolean),
        total,
        query,
        suggestions,
        stats: {
          corpusSize: articles.length,
          keywords: SearchUtils.extractKeywords(query),
        },
      });
    } catch (e: any) {
      console.error("Search error:", e);
      res.status(500).json({ error: "搜索失败", message: e.message });
    }
  });

  // 关键词建议端点（实时）
  app.get("/api/search/suggestions", (req, res) => {
    try {
      const query = String(req.query.q || "").trim();
      
      if (query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const articles = serverCorpus as NewsArticle[];
      
      // 提取关键词
      const keywords = SearchUtils.extractKeywords(query);
      
      // 查找匹配的文章标题
      const matches = articles
        .filter(a => 
          a.title?.toLowerCase().includes(query.toLowerCase()) ||
          a.summary?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10);

      // 同义词扩展建议
      const synonyms = keywords
        .map(kw => SearchUtils.fuzzyMatch(kw, articles.map(a => a.title || "").slice(0, 100)))
        .flat()
        .filter((r, i, self) => i === self.findIndex(t => t.candidate === r.candidate))
        .slice(0, 5);

      res.json({
        query,
        keywords,
        articles: matches.map(a => ({
          id: a.id,
          title: a.title,
          summary: a.summary,
          score: 100,
        })),
        synonyms,
      });
    } catch (e: any) {
      console.error("Suggestions error:", e);
      res.json({ suggestions: [] });
    }
  });

  // Tag cloud endpoint
  app.get("/api/search/tags", (req, res) => {
    try {
      const articles = serverCorpus as NewsArticle[];
      
      // 统计标签频率
      const tagCounts: Record<string, number> = {};
      for (const a of articles) {
        for (const tag of a.tags || []) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      
      // 转换为云数据
      const tags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      res.json({ tags });
    } catch (e: any) {
      console.error("Tags error:", e);
      res.json({ tags: [] });
    }
  });

  // 热门搜索
  app.get("/api/search/popular", (req, res) => {
    res.json({
      popular: [
        { q: "AI 芯片", count: 125 },
        { q: "自动驾驶", count: 98 },
        { q: "新能源", count: 87 },
        { q: "半导体", count: 76 },
        { q: "云计算", count: 65 },
      ],
    });
  });
}

export const SearchRouter = { registerSearchRoutes };
