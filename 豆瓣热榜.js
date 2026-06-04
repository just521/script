/**
 * 玛卡巴卡云端剧场 - 豆瓣热榜 Forward Widget
 */

WidgetMetadata = {
  id: "makkapakka_douban_hot",
  title: "豆瓣热榜",
  description: "豆瓣实时热门影剧综",
  author: "MakkaPakka",
  site: "https://t.me/MakkaPakkaOvO",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  
  modules: [
    {
      title: "豆瓣熱榜",
      description: "豆瓣實時熱門影劇綜",
      functionName: "loadDouban",
      type: "video",
      cacheDuration: 43200,
      params: [
        {
          name: "channel",
          title: "榜單分類",
          type: "enumeration",
          value: "tv",
          enumOptions: [
            { title: "全部劇集", value: "tv" },
            { title: "大陸劇集", value: "tv_domestic" },
            { title: "歐美劇集", value: "tv_american" },
            { title: "日本劇集", value: "tv_japanese" },
            { title: "南韓劇集", value: "tv_korean" },
            { title: "動漫番劇", value: "tv_animation" },
            { title: "紀錄片", value: "tv_documentary" },
            { title: "大陸綜藝", value: "show_domestic" },
            { title: "國外綜藝", value: "show_foreign" }
          ]
        },
        {
          name: "sort_type",
          title: "排序方式",
          type: "enumeration",
          value: "default",
          enumOptions: [
            { title: "默認原序", value: "default" },
            { title: "最近更新", value: "updated" },
            { title: "最近發佈", value: "recent" },
            { title: "熱度最高", value: "heat" },
            { title: "流行趨勢", value: "trending" },
            { title: "高分優先", value: "rating" }
          ]
        },
        {
          name: "page",
          title: "頁碼",
          type: "page",
          startPage: 1
        }
      ]
    }
  ]
};

// ============================================
// Handler Functions
// ============================================

const Utils = {
  emptyTips: [{ id: "empty", type: "text", title: "⚠️ 加载失败", description: "请检查网络连线" }],

  async fetch(filename) {
    const url = `https://raw.githubusercontent.com/MakkaPakka518/List/refs/heads/main/data/${filename}`;
    try {
      const resp = await Widget.http.get(url, { decodable: true });
      if (!resp?.data) return this.emptyTips;
      return typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    } catch (e) {
      console.error(`[Error] ${url}: ${e.message}`);
      return this.emptyTips;
    }
  },

  sortList(list, sortType) {
    if (!list || !Array.isArray(list) || list.length === 0) return list || [];
    if (!sortType || sortType === "default") return list;

    return [...list].sort((a, b) => {
      switch (sortType) {
        case "updated":
          const updateA = a.lastUpdateDate ? new Date(a.lastUpdateDate).getTime() : (a.releaseDate ? new Date(a.releaseDate).getTime() : 0);
          const updateB = b.lastUpdateDate ? new Date(b.lastUpdateDate).getTime() : (b.releaseDate ? new Date(b.releaseDate).getTime() : 0);
          return updateB - updateA;
        case "recent":
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        case "heat":
          const heatA = parseFloat(a.voteCount || a.vote_count) || 0;
          const heatB = parseFloat(b.voteCount || b.vote_count) || 0;
          return heatB - heatA;
        case "trending":
          const trendA = parseFloat(a.popularity) || 0;
          const trendB = parseFloat(b.popularity) || 0;
          return trendB - trendA;
        case "rating":
          const rateA = parseFloat(a.rating) || 0;
          const rateB = parseFloat(b.rating) || 0;
          return rateB - rateA;
        default:
          return 0;
      }
    });
  },

  paginate(list, pageNum, pageSize = 24) {
    if (!list || !Array.isArray(list)) return [];
    const p = parseInt(pageNum) || 1;
    const start = (p - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }
};

/**
 * 模块 1：加载豆瓣榜单
 */
async function loadDouban(params = {}) {
  const data = await Utils.fetch("douban-hot.json");
  if (data === Utils.emptyTips) return data;
  
  let list = data?.[params.channel] || [];
  list = Utils.sortList(list, params.sort_type);
  return Utils.paginate(list, params.page);
}
