/*
 * 节点解锁查询 (精简版)
 * 检测项：YouTube / Netflix / Gemini / ChatGPT
 * 适配环境：Loon
 */

const NF_BASE_URL = "https://www.netflix.com/title/81280792";
const YTB_BASE_URL = "https://www.youtube.com/premium";
const GPT_BASE_URL = 'https://chat.openai.com/';
const GPT_REGION_URL = 'https://chat.openai.com/cdn-cgi/trace';
const GEMINI_URL = 'https://aisandbox-pa.googleapis.com/v1:checkCapability';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

let nodeName = $environment.params ? $environment.params.node : "当前节点";

// 国家旗帜转换表
const flags = (code) => {
    const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
};

let result = {
    "YouTube": "🚫",
    "Netflix": "🚫",
    "Gemini": "🚫",
    "ChatGPT": "🚫"
};

// 执行检测
Promise.all([ytbTest(), nfTest(), gptTest(), geminiTest()]).finally(() => {
    let content = `------------------------------------</br>` +
                  `<b>YouTube：</b>${result["YouTube"]}</br></br>` +
                  `<b>Netflix：</b>${result["Netflix"]}</br></br>` +
                  `<b>Gemini ：</b>${result["Gemini"]}</br></br>` +
                  `<b>ChatGPT：</b>${result["ChatGPT"]}</br>` +
                  `------------------------------------</br>` +
                  `<font color=#CD5C5C><b>节点</b> ➟ ${nodeName}</font>`;
    
    const html = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">${content}</p>`;
    $done({"title": "📺 节点解锁查询", "htmlMessage": html});
});

// --- YouTube ---
function ytbTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: YTB_BASE_URL, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp, data) => {
            if (!err && resp.status === 200 && data.indexOf('Premium is not available in your country') === -1) {
                let region = data.match(/"GL":"(.*?)"/)?.[1] || "US";
                result["YouTube"] = flags(region);
            }
            resolve();
        });
    });
}

// --- Netflix ---
function nfTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: NF_BASE_URL, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err && resp.status === 200) {
                let url = resp.headers['X-Originating-URL'] || resp.headers['x-originating-url'] || "";
                let region = url.split('/')[3]?.split('-')[0]?.toUpperCase() || "US";
                result["Netflix"] = flags(region);
            } else if (!err && resp.status === 404) {
                result["Netflix"] = "⚠️"; // 仅支持自制剧
            }
            resolve();
        });
    });
}

// --- ChatGPT ---
function gptTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: GPT_REGION_URL, timeout: 5000 }, (err, resp, data) => {
            if (!err && data) {
                let region = data.match(/loc=(.*)/)?.[1];
                if (region && region !== "CN") result["ChatGPT"] = flags(region);
            }
            resolve();
        });
    });
}

// --- Gemini ---
function geminiTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: GEMINI_URL, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err && resp.status !== 403 && resp.status !== 400) {
                result["Gemini"] = "✅"; // Gemini 接口通常不返回具体区域代码，仅显示是否可用
            }
            resolve();
        });
    });
}
