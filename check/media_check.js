/*
 * 节点解锁查询 (精简版)
 * 检测项：Netflix / YouTube / Gemini / ChatGPT
 * 适配环境：Loon
 */

const NF_BASE_URL = "https://www.netflix.com/title/81280792";
const YTB_BASE_URL = "https://www.youtube.com/premium";
const GPT_BASE_URL = 'https://chat.openai.com/';
const GPT_REGION_URL = 'https://chat.openai.com/cdn-cgi/trace';
const GEMINI_BASE_URL = 'https://magellan.cloud.google.com/api/v1/user'; // Gemini 地区检查接口

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

let nodeName = $environment.params ? $environment.params.node : "当前节点";

let flags = new Map([["US", "🇺🇸"], ["HK", "🇭🇰"], ["SG", "🇸🇬"], ["JP", "🇯🇵"], ["TW", "🇨🇳"], ["UK", "🇬🇧"], ["KR", "🇰🇷"], ["DE", "🇩🇪"]]);

let result = {
    "title": '📺 节点解锁查询',
    "YouTube": '<b>YouTube: </b>检测失败 ❗️',
    "Netflix": '<b>Netflix: </b>检测失败 ❗️',
    "Gemini": '<b>Gemini: </b>检测失败 ❗️',
    "ChatGPT": '<b>ChatGPT: </b>检测失败 ❗️'
};

let arrow = " ➟ ";

// 执行检测
Promise.all([ytbTest(), nfTest(), gptTest(), geminiTest()]).then(() => {
    finish();
}).catch(() => {
    finish();
});

function finish() {
    let content = "------------------------------------</br>" + 
                  ([result["YouTube"], result["Netflix"], result["Gemini"], result["ChatGPT"]]).join("</br></br>") + 
                  "</br>------------------------------------</br>" + 
                  "<font color=#CD5C5C><b>节点</b> ➟ " + nodeName + "</font>";
    
    content = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">${content}</p>`;
    $done({"title": result["title"], "htmlMessage": content});
}

// --- YouTube 检测 ---
function ytbTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: YTB_BASE_URL, headers: { "User-Agent": UA } }, (err, resp, data) => {
            if (err || resp.status !== 200) {
                result["YouTube"] = "<b>YouTube: </b>检测超时 🚦";
            } else if (data.indexOf('Premium is not available in your country') !== -1) {
                result["YouTube"] = "<b>YouTube: </b>未支持 🚫";
            } else {
                let region = data.match(/"GL":"(.*?)"/)?.[1] || "US";
                result["YouTube"] = `<b>YouTube: </b>支持${arrow}⟦${flags.get(region) || region}⟧ 🎉`;
            }
            resolve();
        });
    });
}

// --- Netflix 检测 ---
function nfTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: NF_BASE_URL, headers: { "User-Agent": UA } }, (err, resp) => {
            if (err) {
                result["Netflix"] = "<b>Netflix: </b>检测超时 🚦";
            } else if (resp.status === 403) {
                result["Netflix"] = "<b>Netflix: </b>未支持 🚫";
            } else if (resp.status === 404) {
                result["Netflix"] = "<b>Netflix: </b>支持自制剧 ⚠️";
            } else if (resp.status === 200) {
                let url = resp.headers['X-Originating-URL'] || resp.headers['x-originating-url'] || "";
                let region = url.split('/')[3]?.split('-')[0]?.toUpperCase() || "US";
                result["Netflix"] = `<b>Netflix: </b>完整支持${arrow}⟦${flags.get(region) || region}⟧ 🎉`;
            }
            resolve();
        });
    });
}

// --- ChatGPT 检测 ---
function gptTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: GPT_BASE_URL, "auto-redirect": false }, (err, resp) => {
            if (err) {
                result["ChatGPT"] = "<b>ChatGPT: </b>未支持 🚫";
                return resolve();
            }
            $httpClient.get({ url: GPT_REGION_URL }, (err, resp, data) => {
                if (!err && data) {
                    let region = data.match(/loc=(.*)/)?.[1] || "??";
                    result["ChatGPT"] = `<b>ChatGPT: </b>支持${arrow}⟦${region}⟧ 🎉`;
                } else {
                    result["ChatGPT"] = "<b>ChatGPT: </b>检测失败 ❗️";
                }
                resolve();
            });
        });
    });
}

// --- Gemini 检测 ---
function geminiTest() {
    return new Promise((resolve) => {
        $httpClient.get({ url: 'https://aisandbox-pa.googleapis.com/v1:checkCapability', headers: { "User-Agent": UA } }, (err, resp) => {
            if (err) {
                result["Gemini"] = "<b>Gemini: </b>检测超时 🚦";
            } else if (resp.status === 403 || resp.status === 400) {
                result["Gemini"] = "<b>Gemini: </b>未支持 🚫";
            } else {
                result["Gemini"] = "<b>Gemini: </b>支持 🎉";
            }
            resolve();
        });
    });
}
