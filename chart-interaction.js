/** 概要: CSS座標をグラフの描画座標へ変換します。引数: rect - 表示領域、width/height - 描画サイズ、clientX/clientY - 操作位置。戻り値: 座標、領域外や無効値の場合はnull。 */
export function chartPoint(rect, width, height, clientX, clientY) {
  if (![rect.left, rect.top, rect.width, rect.height, width, height, clientX, clientY].every(Number.isFinite)
      || rect.width <= 0 || rect.height <= 0) return null;
  const x = (clientX - rect.left) * width / rect.width;
  const y = (clientY - rect.top) * height / rect.height;
  return x >= 0 && y >= 0 && x <= width && y <= height ? { x, y } : null;
}

/** 概要: サンキーのベジェ曲線の帯に操作位置が入るか判定します。引数: region - 帯の座標、point - 操作座標。戻り値: 帯内ならtrue。 */
function insideRibbon(region, point) {
  if (point.x < region.x1 || point.x > region.x2 || region.x2 <= region.x1 || region.thickness <= 0) return false;
  let low = 0;
  let high = 1;
  for (let index = 0; index < 24; index++) {
    const time = (low + high) / 2;
    const x = region.x1 + (region.x2 - region.x1) * (1.5 * time - 1.5 * time ** 2 + time ** 3);
    if (x < point.x) low = time; else high = time;
  }
  const time = (low + high) / 2;
  const y = region.y1 + (region.y2 - region.y1) * (3 * time ** 2 - 2 * time ** 3);
  return point.y >= y - 1e-7 && point.y <= y + region.thickness + 1e-7;
}

/** 概要: 操作位置に対応するデータを、手前に描かれた領域から探します。引数: regions - 矩形・点・帯、point - 描画座標。戻り値: データ、該当がなければnull。 */
export function hitChart(regions, point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  for (const region of [...regions].reverse()) {
    const inside = region.kind === "ribbon" ? insideRibbon(region, point)
      : region.kind === "point" ? Math.hypot(point.x - region.x, point.y - region.y) <= region.radius
      : point.x >= region.x && point.x <= region.x + region.width && point.y >= region.y && point.y <= region.y + region.height;
    if (inside) return region.datum;
  }
  return null;
}
