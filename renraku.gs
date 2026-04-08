// ============================================================
// シフト表 → Slack 自動通知スクリプト
// ------------------------------------------------------------
// 【シートの列構成】
//   A列: 日付 (例: 2025/4/8)
//   B列: 名前
//   C列: 出勤ステータス (例: 出勤 / 休み)
//   D列: 開始時刻 (例: 9:00)
//   E列: 終了時刻 (例: 18:00)
// ============================================================

// ▼ ここだけ書き換えてください
var SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/XXX/YYY/ZZZ";
var SHEET_NAME        = "シフト表";   // スプレッドシートのシート名
var NOTIFY_HOUR       = 8;            // 通知する時刻（時）
var NOTIFY_MINUTE     = 30;           // 通知する時刻（分）

// ============================================================
// メイン関数（トリガーで毎日実行）
// ============================================================
function notifyDailyShift() {
  var sheet  = SpreadsheetApp.getActiveSpreadsheet()
                             .getSheetByName(SHEET_NAME);
  var data   = sheet.getDataRange().getValues();
  var today  = getTodayString();

  var attending = [];
  var absent    = [];

  // 1行目はヘッダーなのでスキップ（i=1から）
  for (var i = 1; i < data.length; i++) {
    var row    = data[i];
    var date   = formatDate(row[0]);
    var name   = row[1];
    var status = row[2];
    var start  = row[3];
    var end    = row[4];

    if (date !== today) continue;

    if (status === "出勤") {
      attending.push(name + "　" + start + "〜" + end);
    } else {
      absent.push(name);
    }
  }

  // 該当データがなければ通知しない
  if (attending.length === 0 && absent.length === 0) return;

  var message = buildMessage(today, attending, absent);
  postToSlack(message);
}

// ============================================================
// Slackメッセージを組み立てる
// ============================================================
function buildMessage(today, attending, absent) {
  var lines = [];
  lines.push("📋 *本日のシフト（" + today + "）*");
  lines.push("");

  if (attending.length > 0) {
    lines.push("*出勤*");
    attending.forEach(function(s) { lines.push("✅ " + s); });
  }

  if (absent.length > 0) {
    lines.push("");
    lines.push("*お休み*");
    absent.forEach(function(n) { lines.push("❌ " + n); });
  }

  return lines.join("\n");
}

// ============================================================
// Slack Incoming Webhook に POST する
// ============================================================
function postToSlack(message) {
  var payload = JSON.stringify({ text: message });
  var options = {
    method:      "post",
    contentType: "application/json",
    payload:     payload
  };
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
}

// ============================================================
// ユーティリティ
// ============================================================
function getTodayString() {
  var d = new Date();
  return (d.getMonth() + 1) + "/" + d.getDate();
}

function formatDate(value) {
  if (!value) return "";
  var d = new Date(value);
  return (d.getMonth() + 1) + "/" + d.getDate();
}

// ============================================================
// トリガー自動登録（初回1回だけ実行）
// ============================================================
function createTrigger() {
  // 既存トリガーを削除してから再登録
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("notifyDailyShift")
    .timeBased()
    .everyDays(1)
    .atHour(NOTIFY_HOUR)
    .nearMinute(NOTIFY_MINUTE)
    .create();
  Logger.log("トリガーを登録しました：毎日 " + NOTIFY_HOUR + ":" + NOTIFY_MINUTE);
}
