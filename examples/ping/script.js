"use strict";

print("Starting Network Ping...");

// State
let wifiReady = 0;
let pingCount = 0;
let successCount = 0;
let failCount = 0;
let minMs = 99999;
let maxMs = 0;
let totalMs = 0;

// Target — lightweight HTTP endpoint
let target = "http://www.msftconnecttest.com/connecttest.txt";
let targetLabel = "msftconnecttest.com";

// Last 8 ping results (ms, -1 = fail)
let r0 = -2; let r1 = -2; let r2 = -2; let r3 = -2;
let r4 = -2; let r5 = -2; let r6 = -2; let r7 = -2;

// Styles
let titleStyle = create_style();
style_set_text_font(titleStyle, 20);
style_set_text_color(titleStyle, 0xFFFFFF);

let infoStyle = create_style();
style_set_text_font(infoStyle, 14);
style_set_text_color(infoStyle, 0x8B949E);

let pingStyle = create_style();
style_set_text_font(pingStyle, 14);
style_set_text_color(pingStyle, 0xC9D1D9);

let latencyStyle = create_style();
style_set_text_font(latencyStyle, 28);
style_set_text_color(latencyStyle, 0x3FB950);

let statStyle = create_style();
style_set_text_font(statStyle, 14);
style_set_text_color(statStyle, 0x58A6FF);

// Card background
let cardBg = create_label(10, 45);
let cardSt = create_style();
style_set_bg_color(cardSt, 0x161B22);
style_set_bg_opa(cardSt, 255);
style_set_width(cardSt, 516);
style_set_height(cardSt, 140);
style_set_radius(cardSt, 12);
style_set_pad_all(cardSt, 10);
obj_add_style(cardBg, cardSt, 0);
label_set_text(cardBg, "");

// UI Labels
let lblTitle = create_label(15, 12);
obj_add_style(lblTitle, titleStyle, 0);
label_set_text(lblTitle, "HTTP Connectivity");

let lblIp = create_label(350, 14);
obj_add_style(lblIp, infoStyle, 0);
label_set_text(lblIp, "No WiFi");

let lblTarget = create_label(20, 36);
obj_add_style(lblTarget, infoStyle, 0);
label_set_text(lblTarget, targetLabel);

// Big latency display
let lblLatency = create_label(20, 65);
obj_add_style(lblLatency, latencyStyle, 0);
label_set_text(lblLatency, "-- ms");

let lblStatus = create_label(20, 100);
obj_add_style(lblStatus, infoStyle, 0);
label_set_text(lblStatus, "Waiting for WiFi...");

// Ping history lines
let lblH0 = create_label(20, 120);
obj_add_style(lblH0, pingStyle, 0);
label_set_text(lblH0, "");

let lblH1 = create_label(20, 136);
obj_add_style(lblH1, pingStyle, 0);
label_set_text(lblH1, "");

let lblH2 = create_label(20, 152);
obj_add_style(lblH2, pingStyle, 0);
label_set_text(lblH2, "");

let lblH3 = create_label(20, 168);
obj_add_style(lblH3, pingStyle, 0);
label_set_text(lblH3, "");

// Stats line
let lblStats = create_label(15, 195);
obj_add_style(lblStats, statStyle, 0);
label_set_text(lblStats, "");

// Bar graph background
let barBg = create_label(10, 215);
let barBgSt = create_style();
style_set_bg_color(barBgSt, 0x0D1117);
style_set_bg_opa(barBgSt, 255);
style_set_width(barBgSt, 516);
style_set_height(barBgSt, 20);
style_set_radius(barBgSt, 4);
obj_add_style(barBg, barBgSt, 0);
label_set_text(barBg, "");

// 8 bar indicators
let mkBar = function(x) {
  let b = create_label(x, 217);
  let s = create_style();
  style_set_bg_color(s, 0x21262D);
  style_set_bg_opa(s, 255);
  style_set_radius(s, 3);
  obj_add_style(b, s, 0);
  obj_set_size(b, 55, 16);
  label_set_text(b, "");
  return {object: b, style: s};
};
let b0 = mkBar(18);
let b1 = mkBar(80);
let b2 = mkBar(142);
let b3 = mkBar(204);
let b4 = mkBar(266);
let b5 = mkBar(328);
let b6 = mkBar(390);
let b7 = mkBar(452);

// Format a result line
let fmtLine = function(seq, ms) {
  if (ms === -2) return "";
  let s = "seq=" + numberToString(seq);
  if (ms < 0) return s + "  timeout";
  return s + "  time=" + numberToString(ms) + " ms";
};

// Update bar color based on latency
let colorBar = function(bar, ms) {
  let color = 0x21262D;
  if (ms === -1 || ms >= 2000) color = 0xF85149;
  if (ms >= 0 && ms < 500) color = 0x3FB950;
  if (ms >= 500 && ms < 2000) color = 0xD29922;
  style_set_bg_color(bar.style, color);
  obj_add_style(bar.object, bar.style, 0);
};

// Update the display
let updateUI = function() {
  // Latest result
  if (r0 === -2) return 0;
  if (r0 < 0) {
    label_set_text(lblLatency, "TIMEOUT");
    style_set_text_color(latencyStyle, 0xF85149);
    obj_add_style(lblLatency, latencyStyle, 0);
  }
  if (r0 >= 0 && r0 < 500) {
    style_set_text_color(latencyStyle, 0x3FB950);
    label_set_text(lblLatency, numberToString(r0) + " ms");
    obj_add_style(lblLatency, latencyStyle, 0);
  }
  if (r0 >= 500 && r0 < 2000) {
    label_set_text(lblLatency, numberToString(r0) + " ms");
    style_set_text_color(latencyStyle, 0xD29922);
    obj_add_style(lblLatency, latencyStyle, 0);
  }
  if (r0 >= 2000) {
    label_set_text(lblLatency, numberToString(r0) + " ms");
    style_set_text_color(latencyStyle, 0xF85149);
    obj_add_style(lblLatency, latencyStyle, 0);
  }

  // Status
  let pct = 0;
  if (pingCount > 0) pct = (successCount * 100) / pingCount;
  label_set_text(lblStatus, numberToString(pingCount) + " sent, " + numberToString(failCount) + " lost (" + format_number(100 - pct, 1) + "% loss)");

  // History lines (show last 4 with seq numbers)
  let seq0 = pingCount;
  let seq1 = pingCount - 1;
  let seq2 = pingCount - 2;
  let seq3 = pingCount - 3;
  label_set_text(lblH0, fmtLine(seq0, r0));
  label_set_text(lblH1, fmtLine(seq1, r1));
  label_set_text(lblH2, fmtLine(seq2, r2));
  label_set_text(lblH3, fmtLine(seq3, r3));

  // Stats
  if (successCount > 0) {
    let avg = totalMs / successCount;
    label_set_text(lblStats, "min=" + numberToString(minMs) + "  avg=" + format_number(avg, 0) + "  max=" + numberToString(maxMs) + " ms");
  }

  // Bars
  colorBar(b0, r0);
  colorBar(b1, r1);
  colorBar(b2, r2);
  colorBar(b3, r3);
  colorBar(b4, r4);
  colorBar(b5, r5);
  colorBar(b6, r6);
  colorBar(b7, r7);
};

// Perform one ping
let doPing = function() {
  // Shift history
  r7 = r6; r6 = r5; r5 = r4; r4 = r3;
  r3 = r2; r2 = r1; r1 = r0;

  let t1 = get_millis();
  let resp = http_get(target);
  let t2 = get_millis();
  let elapsed = t2 - t1;
  if (elapsed < 0) elapsed = elapsed + 4294967296;

  pingCount++;

  if (resp !== "Microsoft Connect Test") {
    r0 = -1;
    failCount++;
    print("ping " + numberToString(pingCount) + ": timeout");
  } else {
    r0 = elapsed;
    successCount++;
    totalMs = totalMs + elapsed;
    if (elapsed < minMs) minMs = elapsed;
    if (elapsed > maxMs) maxMs = elapsed;
    print("ping " + numberToString(pingCount) + ": " + numberToString(elapsed) + " ms");
  }

  updateUI();
};

// Main loop
let lastPing = 0;
let firstPing = 1;

let main_loop = function() {
  if (!wifi_status()) {
    wifiReady = 0;
    firstPing = 1;
    label_set_text(lblIp, "No WiFi");
    label_set_text(lblStatus, "Waiting for WiFi...");
    return 0;
  }
  if (!wifiReady) {
    wifiReady = 1;
    label_set_text(lblIp, wifi_get_ip());
  }
  let now = get_millis();
  let elapsed = now - lastPing;
  if (elapsed < 0) elapsed = elapsed + 4294967296;
  if (firstPing || elapsed >= 5000) {
    firstPing = 0;
    lastPing = now;
    doPing();
  }
};

create_timer("main_loop", 1000);
print("Network Ping ready!");
