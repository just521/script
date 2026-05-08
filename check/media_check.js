/*
 * 节点解锁查询 (精简修复版)
 * 检测项：YouTube / Netflix / Gemini / ChatGPT
 * 适配环境：Loon
 */

const NF_BASE_URL = "https://www.netflix.com/title/81280792";
const YTB_BASE_URL = "https://www.youtube.com/premium";
const GPT_REGION_URL = 'https://chat.openai.com/cdn-cgi/trace';
const GEMINI_URL = 'https://aisandbox-pa.googleapis.com/v1:checkCapability';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

let nodeName = $environment.params ? $environment.params.node : "当前节点";

// 动态生成国旗 Emoji
const getFlag = (code) => {
    if (!code || code.length !== 2) return "🚫";
    if (code === "CN") return "🇨🇳";
    const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
};

let result = {
    "YouTube": "🚫",
    "Netflix": "🚫",
    "Gemini": "🚫",
    "ChatGPT": "🚫"
};

// 预设节点地区（默认美国，若能检测到则覆盖）
let nodeRegion = "US"; 

Promise.all([ytbTest(), nfTest(), gptTest(), geminiTest()]).finally(() => {
    let content = `------------------------------------</br>` +
                  `<b>YouTube ：</b>${result["YouTube"]}</br></br>` +
                  `<b>Netflix ：</b>${result["Netflix"]}</br></br>` +
                  `<b>Gemini  ：</b>${result["Gemini"]}</br></br>` +
                  `<b>ChatGPT ：</b>${result["ChatGPT"]}</br>` +
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
                result["YouTube"] = getFlag(region);
                nodeRegion = region; // 以 YTB 检测到的地区作为基准
            }
            resolve();
        });
    });
}

// --- Netflix (修复逻辑) ---
function nfTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: NF_BASE_URL, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err) {
                if (resp.status === 200) {
                    // 修复：多重尝试获取地区代码，防止出现乱码字符
                    let url = resp.headers['X-Originating-URL'] || resp.headers['x-originating-url'] || "";
                    let regionMatch = url.match(/netflix\.com\/([a-z]{2})/i);
                    let region = regionMatch ? regionMatch[1].toUpperCase() : "US";
                    // 过滤掉 'TI' 等非地区标识符
                    if (region.length !== 2 || region === "TI") region = nodeRegion; 
                    result["Netflix"] = getFlag(region);
                } else if (resp.status === 404) {
                    result["Netflix"] = "⚠️"; // 仅支持自制剧
                }
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
                if (region && region !== "CN") result["ChatGPT"] = getFlag(region);
            }
            resolve();
        });
    });
}

// --- Gemini (修复：返回国旗) ---
function geminiTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: GEMINI_URL, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err && resp.status !== 403 && resp.status !== 400) {
                // Gemini 支持时，显示当前节点的国旗
                result["Gemini"] = getFlag(nodeRegion);
            }
            resolve();
        });
    });
}
