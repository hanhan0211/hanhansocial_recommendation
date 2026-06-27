import { GoogleGenAI } from "@google/genai";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE: AI Writing Assistant (Trợ lý viết bài thông minh)
 * ═══════════════════════════════════════════════════════════════════════════
 * SỬ DỤNG: Google Gemini 2.5 Flash (miễn phí)
 * MỤC ĐÍCH: Hỗ trợ user tạo caption, viết lại nội dung, gợi ý hashtag
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── KHỞI TẠO GEMINI CLIENT ─────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

// ─── CÁC TONE VIẾT BÀI ─────────────────────────────────────────────────────
const TONE_PROMPTS = {
  casual: "thân thiện, tự nhiên như đang nói chuyện với bạn bè",
  professional: "chuyên nghiệp, lịch sự, trang trọng",
  funny: "hài hước, vui nhộn, có thể dùng emoji và từ ngữ đáng yêu",
  romantic: "lãng mạn, trữ tình, giàu cảm xúc",
  inspirational: "truyền cảm hứng, động lực, tích cực",
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HÀM 1: TẠO CAPTION TỪ Ý TƯỞNG
 * ═══════════════════════════════════════════════════════════════════════════
 * @param {String} idea - Ý tưởng ngắn gọn của user (VD: "đi biển cuối tuần")
 * @param {String} tone - Tone viết: casual, professional, funny, romantic, inspirational
 * @returns {Object} { caption, hashtags }
 */
export const generateCaption = async (idea, tone = "casual") => {
  try {
    const toneDescription = TONE_PROMPTS[tone] || TONE_PROMPTS.casual;

    const prompt = `Bạn là trợ lý viết bài cho mạng xã hội tiếng Việt. 
Hãy viết một caption (bài đăng mạng xã hội) dựa trên ý tưởng sau:

Ý TƯỞNG: "${idea}"
GIỌNG VĂN: ${toneDescription}

YÊU CẦU:
- Viết bằng tiếng Việt, tự nhiên, phù hợp để đăng lên mạng xã hội
- Độ dài vừa phải (2-4 câu), không quá dài
- Có thể thêm emoji phù hợp
- Gợi ý 3-5 hashtag liên quan ở cuối (mỗi hashtag không có dấu cách, viết thường)
- QUAN TRỌNG: Trả về đúng format JSON sau, KHÔNG thêm markdown hay ký tự thừa:

{"caption": "nội dung caption ở đây", "hashtags": ["hashtag1", "hashtag2", "hashtag3"]}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text.trim();
    
    // Parse JSON từ response (loại bỏ markdown code block nếu có)
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      caption: result.caption || "",
      hashtags: (result.hashtags || []).map(tag => tag.replace(/^#/, '').toLowerCase()),
    };
  } catch (error) {
    console.error("❌ Lỗi generateCaption:", error.message);
    throw new Error("Không thể tạo caption. Vui lòng thử lại!");
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HÀM 2: VIẾT LẠI NỘI DUNG THEO TONE KHÁC
 * ═══════════════════════════════════════════════════════════════════════════
 * @param {String} content - Nội dung gốc cần viết lại
 * @param {String} tone - Tone mới muốn chuyển đổi
 * @returns {Object} { rewrittenContent }
 */
export const rewriteContent = async (content, tone = "casual") => {
  try {
    const toneDescription = TONE_PROMPTS[tone] || TONE_PROMPTS.casual;

    const prompt = `Bạn là trợ lý viết bài cho mạng xã hội tiếng Việt.
Hãy viết lại nội dung sau theo giọng văn mới:

NỘI DUNG GỐC: "${content}"
GIỌNG VĂN MỚI: ${toneDescription}

YÊU CẦU:
- Giữ nguyên ý nghĩa chính của nội dung gốc
- Viết lại bằng tiếng Việt với giọng văn mới
- Có thể thêm/bớt emoji cho phù hợp
- Giữ các hashtag nếu có trong nội dung gốc
- QUAN TRỌNG: Trả về đúng format JSON sau, KHÔNG thêm markdown hay ký tự thừa:

{"rewrittenContent": "nội dung đã viết lại ở đây"}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text.trim();
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      rewrittenContent: result.rewrittenContent || content,
    };
  } catch (error) {
    console.error("❌ Lỗi rewriteContent:", error.message);
    throw new Error("Không thể viết lại nội dung. Vui lòng thử lại!");
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HÀM 3: GỢI Ý HASHTAG THÔNG MINH
 * ═══════════════════════════════════════════════════════════════════════════
 * @param {String} content - Nội dung bài viết
 * @returns {Object} { hashtags }
 */
export const suggestHashtags = async (content) => {
  try {
    const prompt = `Bạn là trợ lý gợi ý hashtag cho mạng xã hội tiếng Việt.
Hãy phân tích nội dung sau và gợi ý các hashtag phù hợp:

NỘI DUNG: "${content}"

YÊU CẦU:
- Gợi ý 5-8 hashtag liên quan đến nội dung
- Hashtag viết thường, không có dấu cách, không có ký tự đặc biệt
- Bao gồm cả hashtag tiếng Việt (không dấu) và tiếng Anh phổ biến
- Ưu tiên các hashtag trending, dễ tìm kiếm
- QUAN TRỌNG: Trả về đúng format JSON sau, KHÔNG thêm markdown hay ký tự thừa:

{"hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text.trim();
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      hashtags: (result.hashtags || []).map(tag => tag.replace(/^#/, '').toLowerCase()),
    };
  } catch (error) {
    console.error("❌ Lỗi suggestHashtags:", error.message);
    throw new Error("Không thể gợi ý hashtag. Vui lòng thử lại!");
  }
};
