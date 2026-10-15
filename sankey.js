/**
 * 概要: 収支の配分総額から中央の合流部の大きさを決め、極端な太さを防ぎます。
 * 引数: total - 百万円単位の流入総額。支出側を加算して二重計上しません。
 * 戻り値: 高さ144〜240px、横幅20〜28pxの合流部サイズ。
 */
export function sankeyHubSize(total) {
  const amount = Number.isFinite(total) && total > 0 ? total : 0;
  const height = Math.min(240, Math.max(144, 144 + 24 * Math.log10(1 + amount / 10000)));
  return { height, width: Math.min(28, Math.max(20, height / 9)) };
}

/**
 * 概要: 売上・費用・税金等・純利益を、金額が保存されるサンキーの流れに整形します。
 * 引数: result - 百万円単位の四半期業績。profit - 営業利益または税引前利益。
 * 戻り値: 流入・流出ノードと総額。主要値が欠損している場合はnull。
 */
export function buildIncomeFlow(result, profit) {
  if (!Number.isFinite(result?.revenue) || result.revenue < 0 || !Number.isFinite(result.netIncome)) return null;
  const detailed = detailedIncomeFlow(result);
  if (detailed) return detailed;
  const sources = [];
  const targets = [];
  const add = (nodes, label, value, kind) => {
    if (value > 0) nodes.push({ label, value, kind });
  };
  const separateCosts = Number.isFinite(result.operatingCost) || Number.isFinite(profit);
  const cost = Number.isFinite(result.operatingCost) ? result.operatingCost
    : result.revenue - (Number.isFinite(profit) ? profit : result.netIncome);
  const adjustment = result.netIncome - (result.revenue - cost);
  add(sources, "売上収益", result.revenue, "revenue");
  add(targets, separateCosts ? "営業費用・費用等" : "費用・税金等（差額）", cost, "expense");
  add(sources, "収益・費用の調整（差額）", -cost, "other");
  add(sources, "税金・その他（増益）", adjustment, "other");
  add(targets, "税金・その他（減益）", -adjustment, "expense");
  add(targets, "純利益", result.netIncome, "profit");
  // 赤字は費用を賄えない差額として補います。収入としては扱いません。
  add(sources, "純損失（不足額）", -result.netIncome, "loss");
  return { sources, targets, total: sources.reduce((sum, node) => sum + node.value, 0),
    hasLoss: result.netIncome < 0, separateCosts };
}

/**
 * 概要: 公式損益計算書の細目を収入・支出に分類し、未分類の差額を明示して金額を保ちます。
 * 引数: result - 主要値と原本の科目配列を持つ業績。
 * 戻り値: 詳細サンキーのモデル。細目がない場合はnull。
 */
export function detailedIncomeFlow(result) {
  if (!Array.isArray(result?.statementRows)) return null;
  const sources = [];
  const targets = [];
  const addEffect = (label, effect, kind) => {
    if (!Number.isFinite(effect) || effect === 0) return;
    (effect > 0 ? sources : targets).push({ label, value: Math.abs(effect), kind: effect > 0 ? kind : "expense" });
  };
  const rows = [...new Map(result.statementRows.map((row) => [`${row.group ?? ""}:${row.label}`, row])).values()];
  const revenueParts = rows.filter((row) => /^(商品・製品売上収益|金融事業に係る金融収益|商品販売等に係る収益|役務提供及びロイヤルティ取引に係る収益|資金運用収益|信託報酬|役務取引等収益|特定取引収益|その他業務収益|その他経常収益)$/.test(row.label));
  const partTotal = revenueParts.reduce((sum, row) => sum + row.value, 0);
  if (revenueParts.length && partTotal <= result.revenue + 1) {
    revenueParts.forEach((row) => addEffect(row.label, row.value, "revenue"));
    if (result.revenue - partTotal > 1) addEffect("その他売上収益（差額）", result.revenue - partTotal, "revenue");
  } else addEffect("売上収益", result.revenue, "revenue");
  let count = 0;
  for (const row of rows) {
    const label = row.label;
    const expenseEffect = result.signedExpenses ? row.value : -row.value;
    let effect;
    if (/^(その他の収益及び費用合計|金融収益及び金融費用合計|営業外収益合計|営業外費用合計)$/.test(label)) continue;
    if (/^特別(利益|損失)(合計)?$/.test(label)) {
      const section = label.replace(/合計$/, "");
      if (rows.some((item) => item.group === section && item.label !== label)) continue;
    }
    if (label === "原価合計" && rows.some((item) => /係る原価$/.test(item.label))) continue;
    if (label === "販売費及び一般管理費合計" && rows.some((item) => item.group === "販売費及び一般管理費" && item.label !== label)) continue;
    if (label === "投資損益合計" && rows.some((item) => item.group === "投資損益" && item.label !== label)) continue;
    if (row.group === "販売費及び一般管理費" && label !== "販売費及び一般管理費合計") effect = expenseEffect;
    else if (row.group === "営業外収益" && label !== "営業外収益合計") effect = row.value;
    else if (row.group === "営業外費用" && label !== "営業外費用合計") effect = expenseEffect;
    else if (row.group === "投資損益" && label !== "投資損益合計") effect = row.value;
    else if (row.group === "特別利益" && label !== "特別利益合計") effect = row.value;
    else if (row.group === "特別損失" && label !== "特別損失合計") effect = expenseEffect;
    else if (/^(売上原価|原価|原価合計|商品販売等に係る原価|役務提供及びロイヤルティ取引に係る原価|販売費及び一般管理費|販売費及び一般管理費合計|販売費および一般管理費|販売費一般管理費|金融事業に係る金融費用|資金調達費用|役務取引等費用|特定取引費用|その他業務費用|営業経費|その他経常費用|人件費|経費|減価償却費|固定資産除却費|減損損失|租税公課|貸倒損失)$/.test(label)) {
      effect = expenseEffect;
    } else if (/^(その他の金融費用|金融費用|財務費用|その他の費用|特別損失|支払利息|為替差損|雑損失)$/.test(label)) {
      effect = result.signedExpenses ? row.value : -Math.abs(row.value);
    } else if (/^(法人所得税費用|法人所得税|法人税等合計|法人税等|法人税、住民税及び事業税|法人税等調整額|非支配持分|非支配持分に帰属する四半期(?:純)?利益|非支配株主に帰属する四半期純利益)$/.test(label)) {
      // 合計が開示される法人税等は、内訳と重複させません。
      if (/法人税、|法人税等調整額/.test(label) && rows.some((item) => /^(法人税等合計|法人税等)$/.test(item.label))) continue;
      const tax = /^(法人所得税費用|法人所得税)$/.test(label);
      effect = tax && result.signedExpenses ? row.value : -row.value;
    } else if (/^その他の営業損/.test(label)) effect = -row.value;
    else if (/^(その他の金融収益|金融収益|その他の収益|持分法による投資|為替差損益|その他[<（(]|特別利益|投資損益合計|その他の損益|デリバティブ関連損益|SVFの外部投資家持分|受取利息|受取配当金|為替差益|雑収入|有価証券損益|固定資産に係る損益|固定資産除・売却損益|固定資産減損損失及び戻入)/.test(label)) {
      effect = row.value;
    }
    if (effect !== undefined) { addEffect(label === "その他" && row.group ? `${row.group} / その他` : label, effect, "other"); count++; }
  }
  if (count < 3) return null;
  if (result.netIncome > 0) targets.push({ label: "親会社帰属純利益", value: result.netIncome, kind: "profit" });
  if (result.netIncome < 0) sources.push({ label: "純損失（不足額）", value: -result.netIncome, kind: "loss" });
  const sum = (nodes) => nodes.reduce((total, node) => total + node.value, 0);
  const residual = sum(targets) - sum(sources);
  if (Math.abs(residual) > 0.000001) addEffect(Math.abs(residual) <= 3 ? "丸め差額（計算）" : "未分類差額（計算）", residual, "other");
  return { sources, targets, total: sum(sources), hasLoss: result.netIncome < 0,
    separateCosts: true, detailed: true, residual };
}
