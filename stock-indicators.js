/** 概要: 終値の単純移動平均を取引日数で計算します。引数: prices - 日足、period - 取引日数。戻り値: 日足と同じ長さの平均配列。期間不足・欠損はnull。 */
export function movingAverage(prices, period) {
  if (!Number.isInteger(period) || period < 1) throw new RangeError("移動平均の日数が正しくありません");
  let sum = 0;
  let missing = 0;
  return prices.map((price, index) => {
    if (Number.isFinite(price.close)) sum += price.close; else missing++;
    if (index >= period) {
      const previous = prices[index - period].close;
      if (Number.isFinite(previous)) sum -= previous; else missing--;
    }
    return index + 1 >= period && missing === 0 ? sum / period : null;
  });
}

/** 概要: 表示範囲の最高値を0%、最低値を100%にしてフィボナッチ水準を求めます。引数: prices - 表示する日足。戻り値: 極値・日付・水準。値幅がない場合はnull。 */
export function fibonacciRetracement(prices) {
  const valid = prices.filter((row) => Number.isFinite(row.high) && Number.isFinite(row.low));
  if (!valid.length) return null;
  const highest = valid.reduce((best, row) => row.high > best.high ? row : best);
  const lowest = valid.reduce((best, row) => row.low < best.low ? row : best);
  if (highest.high <= lowest.low) return null;
  return { high:highest.high, low:lowest.low, highDate:highest.date, lowDate:lowest.date,
    levels:[0,0.236,0.382,0.5,0.618,0.786,1].map((ratio) => ({ratio,price:highest.high - (highest.high - lowest.low) * ratio})) };
}

/** 概要: 過去データを含めてMAを計算し、最後の日付から1年の日足だけを描画対象にします。引数: history - 時系列順の日足。戻り値: 表示日足・MA3本・フィボナッチ。 */
export function stockIndicators(history) {
  if (!history.length) return {prices:[],averages:{5:[],25:[],100:[]},fibonacci:null};
  const cutoff = Date.parse(history.at(-1).date) - 365 * 86400000;
  const indexes = history.map((row, index) => Date.parse(row.date) >= cutoff ? index : -1).filter((index) => index >= 0);
  const prices = indexes.map((index) => history[index]);
  const averages = Object.fromEntries([5,25,100].map((period) => {
    const values = movingAverage(history,period);
    return [period,indexes.map((index) => values[index])];
  }));
  return {prices,averages,fibonacci:fibonacciRetracement(prices)};
}
