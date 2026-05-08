/**
 * 适配 Loon 的流媒体检测脚本
 * 原作者: @XIAO_KOP
 */

const BASE_URL = 'https://www.netflix.com/title/';
const BASE_URL_YTB = "https://www.youtube.com/premium";
const BASE_URL_DISNEY = 'https://www.disneyplus.com';
const BASE_URL_Dazn = "https://startup.core.indazn.com/misl/v5/Startup";
const BASE_URL_Param = "https://www.paramountplus.com/"
const FILM_ID = 81280792
const BASE_URL_GPT = 'https://chat.openai.com/'
const Region_URL_GPT = 'https://chat.openai.com/cdn-cgi/trace'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
const arrow = " ➟ "

let result = {
    "YouTube": 'YouTube: 检测失败 ❗️',
    "Netflix": 'Netflix: 检测失败 ❗️',
    "Disney": "Disneyᐩ: 检测失败 ❗️",
    "ChatGPT": "ChatGPT: 检测失败 ❗️"
};

// 简化的国家旗帜 Map
const flags = new Map([["US", "🇺🇸"], ["HK", "🇭🇰"], ["SG", "🇸🇬"], ["JP", "🇯🇵"], ["TW", "🇹🇼"], ["UK", "🇬🇧"]]);

(async () => {
    await Promise.all([
        testYTB(),
        testNf(FILM_ID),
        testDisneyPlus(),
        testChatGPT()
    ]);

    let content = [
        result["YouTube"],
        result["Netflix"],
        result["Disney"],
        result["ChatGPT"]
    ].join("\n");

    $notification.post("📺 流媒体解锁查询", "检测结果", content);
    $done();
})();

// --- 检测函数 (已适配 Loon $httpClient) ---

function testYTB() {
    return new Promise((resolve) => {
        $httpClient.get({ url: BASE_URL_YTB, headers: { "User-Agent": UA } }, (error, response, data) => {
            if (error || response.status !== 200) {
                result["YouTube"] = "YouTube Premium: 检测超时 🚦";
            } else if (data.indexOf('Premium is not available in your country') !== -1) {
                result["YouTube"] = "YouTube Premium: 未支持 🚫";
            } else {
                let region = data.match(/"GL":"(.*?)"/)?.[1] || "US";
                result["YouTube"] = `YouTube Premium: 支持${arrow}⟦${flags.get(region) || region}⟧ 🎉`;
            }
            resolve();
        });
    });
}

function testNf(filmId) {
    return new Promise((resolve) => {
        $httpClient.get({ url: BASE_URL + filmId, headers: { "User-Agent": UA } }, (error, response) => {
            if (error) {
                result["Netflix"] = "Netflix: 检测超时 🚦";
            } else if (response.status === 404) {
                result["Netflix"] = "Netflix: 支持自制剧集 ⚠️";
            } else if (response.status === 403) {
                result["Netflix"] = "Netflix: 未支持 🚫";
            } else if (response.status === 200) {
                result["Netflix"] = "Netflix: 完整支持 🎉";
            }
            resolve();
        });
    });
}

async function testDisneyPlus() {
    return new Promise((resolve) => {
        $httpClient.get({ url: BASE_URL_DISNEY, headers: { "User-Agent": UA } }, (error, response, data) => {
            if (error) {
                result["Disney"] = "Disneyᐩ: 检测失败 ❗️";
            } else if (data && data.indexOf('not available in your region') !== -1) {
                result["Disney"] = "Disneyᐩ: 未支持 🚫";
            } else {
                result["Disney"] = "Disneyᐩ: 支持 🎉";
            }
            resolve();
        });
    });
}

function testChatGPT() {
    return new Promise((resolve) => {
        $httpClient.get({ url: Region_URL_GPT, headers: { "User-Agent": UA } }, (error, response, data) => {
            if (error || !data) {
                result["ChatGPT"] = "ChatGPT: 检测失败 ❗️";
            } else {
                let region = data.match(/loc=(.*)/)?.[1] || "未知";
                result["ChatGPT"] = `ChatGPT: 支持${arrow}⟦${region}⟧ 🎉`;
            }
            resolve();
        });
    });
}
