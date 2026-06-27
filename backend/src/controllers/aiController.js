import { generateCaption, rewriteContent, suggestHashtags } from "../services/aiService.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTROLLER: AI Writing Assistant
 * ═══════════════════════════════════════════════════════════════════════════
 * 3 API endpoints để hỗ trợ user tạo nội dung bài viết bằng AI
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * POST /api/ai/generate-caption
 * Body: { idea: "đi biển cuối tuần", tone: "casual" }
 * Response: { caption: "...", hashtags: [...] }
 */
export const handleGenerateCaption = async (req, res) => {
  try {
    const { idea, tone } = req.body;

    if (!idea || idea.trim() === "") {
      return res.status(400).json({ message: "Vui lòng nhập ý tưởng cho bài viết!" });
    }

    console.log(`\n🤖 AI Generate Caption — User: ${req.user.username}, Idea: "${idea}", Tone: ${tone}`);

    const result = await generateCaption(idea.trim(), tone);

    console.log(`✅ AI trả về caption thành công (${result.caption.length} ký tự, ${result.hashtags.length} hashtags)`);

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi handleGenerateCaption:", error.message);
    res.status(500).json({ message: error.message || "Lỗi server khi tạo caption AI" });
  }
};

/**
 * POST /api/ai/rewrite
 * Body: { content: "nội dung gốc", tone: "funny" }
 * Response: { rewrittenContent: "..." }
 */
export const handleRewriteContent = async (req, res) => {
  try {
    const { content, tone } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Vui lòng nhập nội dung cần viết lại!" });
    }

    console.log(`\n🤖 AI Rewrite — User: ${req.user.username}, Tone: ${tone}`);

    const result = await rewriteContent(content.trim(), tone);

    console.log(`✅ AI viết lại thành công (${result.rewrittenContent.length} ký tự)`);

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi handleRewriteContent:", error.message);
    res.status(500).json({ message: error.message || "Lỗi server khi viết lại nội dung" });
  }
};

/**
 * POST /api/ai/suggest-hashtags
 * Body: { content: "nội dung bài viết" }
 * Response: { hashtags: ["hashtag1", "hashtag2", ...] }
 */
export const handleSuggestHashtags = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Vui lòng nhập nội dung để gợi ý hashtag!" });
    }

    console.log(`\n🤖 AI Suggest Hashtags — User: ${req.user.username}`);

    const result = await suggestHashtags(content.trim());

    console.log(`✅ AI gợi ý ${result.hashtags.length} hashtags thành công`);

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi handleSuggestHashtags:", error.message);
    res.status(500).json({ message: error.message || "Lỗi server khi gợi ý hashtag" });
  }
};
