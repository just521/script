/*
 * 节点解锁查询 (UI & 逻辑深度修复版)
 * 检测项：YouTube / Netflix / Gemini / ChatGPT
 */

const NF_BASE_URL = "https://www.netflix.com/title/81280792";
const YTB_BASE_URL = "https://www.youtube.com/premium";
const GPT_REGION_URL = 'https://chat.openai.com/cdn-cgi/trace';
const GEMINI_URL = 'https://aisandbox-pa.googleapis.com/v1:checkCapability';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

let testNode = $environment.params ? $environment.params.node : null;
let detectedRegion = ""; // 全局记录检测到的地区代码

const getFlag = (code) => {
    if (!code || code.length !== 2 || code === "TI") return "🚫";
    const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
};

let result = {
    "YouTube": "🚫",
    "Netflix": "🚫",
    "Gemini": "🚫",
    "ChatGPT": "🚫"
};

const cacheBust = () => `?t=${Date.now()}`;

// 这里的 Promise 顺序很重要，先跑 YTB/GPT 获取地区
Promise.all([ytbTest(), gptTest()]).then(() => {
    return Promise.all([nfTest(), geminiTest()]);
}).finally(() => {
    let content = `------------------------------------</br>` +
                  `<b>YouTube ：</b>${result["YouTube"]}</br></br>` +
                  `<b>Netflix ：</b>${result["Netflix"]}</br></br>` +
                  `<b>Gemini  ：</b>${result["Gemini"]}</br></br>` +
                  `<b>ChatGPT ：</b>${result["ChatGPT"]}</br>` +
                  `------------------------------------</br>` +
                  `<font color=#CD5C5C><b>测试节点</b> ➟ ${testNode || "默认出口"}</font>`;
    
    const html = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">${content}</p>`;
    $done({"title": "📺 节点解锁查询", "htmlMessage": html});
});

// --- YouTube (作为地区基准) ---
function ytbTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: YTB_BASE_URL + cacheBust(), node: testNode, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp, data) => {
            if (!err && resp.status === 200 && data.indexOf('Premium is not available in your country') === -1) {
                let region = data.match(/"GL":"(.*?)"/)?.[1];
                if (region) {
                    detectedRegion = region.toUpperCase();
                    result["YouTube"] = getFlag(detectedRegion);
                }
            }
            resolve();
        });
    });
}

// --- Netflix (彻底解决 TI 乱码) ---
function nfTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: NF_BASE_URL + cacheBust(), node: testNode, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err) {
                if (resp.status === 200) {
                    let url = resp.headers['X-Originating-URL'] || resp.headers['x-originating-url'] || "";
                    // 更加严谨的正则：只匹配 com/ 后面跟着的两个字母，且排除 title 路径
                    let regionMatch = url.match(/netflix\.com\/([a-z]{2})(?=-|\/|$)/i);
                    let region = (regionMatch && regionMatch[1].toUpperCase() !== "TI") ? regionMatch[1].toUpperCase() : detectedRegion;
                    
                    result["Netflix"] = getFlag(region || "US");
                } else if (resp.status === 404) {
                    result["Netflix"] = "⚠️";
                }
            }
            resolve();
        });
    });
}

// --- ChatGPT ---
function gptTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: GPT_REGION_URL + cacheBust(), node: testNode, timeout: 5000 }, (err, resp, data) => {
            if (!err && data) {
                let region = data.match(/loc=(.*)/)?.[1];
                if (region && region !== "CN") {
                    let code = region.toUpperCase();
                    if (!detectedRegion) detectedRegion = code;
                    result["ChatGPT"] = getFlag(code);
                }
            }
            resolve();
        });
    });
}

// --- Gemini (联动展示旗帜) ---
function geminiTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: GEMINI_URL, node: testNode, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err && resp.status !== 403 && resp.status !== 400) {
                // 如果 Gemini 可用，直接使用已检测到的地区旗帜
                result["Gemini"] = getFlag(detectedRegion || "US"); 
            }
            resolve();
        });
    });
}
