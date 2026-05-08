/*
 * 节点解锁查询 (专项测试修复版)
 * 适配：Loon 策略组节点列表点击测试
 */

const NF_BASE_URL = "https://www.netflix.com/title/81280792";
const YTB_BASE_URL = "https://www.youtube.com/premium";
const GPT_REGION_URL = 'https://chat.openai.com/cdn-cgi/trace';
const GEMINI_URL = 'https://aisandbox-pa.googleapis.com/v1:checkCapability';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

// 关键点：Loon 手动测试节点时，必须显式指定选中的节点
let testNode = $environment.params ? $environment.params.node : null;

const getFlag = (code) => {
    if (!code || code.length !== 2) return "🚫";
    const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
};

let result = {
    "YouTube": "🚫",
    "Netflix": "🚫",
    "Gemini": "🚫",
    "ChatGPT": "🚫"
};

// 增加随机数防止 URL 缓存
const cacheBust = () => `?t=${Date.now()}`;

Promise.all([ytbTest(), nfTest(), gptTest(), geminiTest()]).finally(() => {
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

// --- YouTube ---
function ytbTest() {
    return new Promise((resolve) => {
        // 使用 node 参数强制走被选中的测试节点
        $httpClient.get({ url: YTB_BASE_URL + cacheBust(), node: testNode, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp, data) => {
            if (!err && resp.status === 200 && data.indexOf('Premium is not available in your country') === -1) {
                let region = data.match(/"GL":"(.*?)"/)?.[1] || "US";
                result["YouTube"] = getFlag(region);
            }
            resolve();
        });
    });
}

// --- Netflix ---
function nfTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: NF_BASE_URL + cacheBust(), node: testNode, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err && resp.status === 200) {
                let url = resp.headers['X-Originating-URL'] || resp.headers['x-originating-url'] || "";
                let regionMatch = url.match(/netflix\.com\/([a-z]{2})/i);
                let region = regionMatch ? regionMatch[1].toUpperCase() : "US";
                result["Netflix"] = getFlag(region);
            } else if (!err && resp.status === 404) {
                result["Netflix"] = "⚠️";
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
                if (region && region !== "CN") result["ChatGPT"] = getFlag(region);
            }
            resolve();
        });
    });
}

// --- Gemini ---
function geminiTest() {
    return new Promise((resolve) => {
        // 注意：Gemini 通常与当前节点地区挂钩，我们通过 YTB 的结果来反推地区或显示成功图标
        $httpClient.get({ url: GEMINI_URL, node: testNode, headers: { "User-Agent": UA }, timeout: 5000 }, (err, resp) => {
            if (!err && resp.status !== 403 && resp.status !== 400) {
                result["Gemini"] = "✅"; 
            }
            resolve();
        });
    });
}
