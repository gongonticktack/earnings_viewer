const compact = text => text.normalize('NFKC').replace(/[\s・･]/g,'');
const number = token => !token || /^[－―—-]$/.test(token) ? null : Number(token.replace(/[△▲−]/,'-').replaceAll(',',''));

/** 概要: 連結CF計算書の当期列から現金残高・3種類のCF・細目を読みます。引数: pages - PDF行と番号、period - 損益と共通の実績期間。戻り値: 百万円単位のCFと原本科目、開示を確定できなければnull。 */
export function parseCashFlowPages(pages, period) {
  for (let index=0;index<pages.length;index++) {
    const page=pages[index];
    const text=compact(page.lines.join(' '));
    if (!/連結キャッシュ.*フロー計算書/.test(compact(page.lines.slice(0,6).join(' ')))
      || /非連結キャッシュ/.test(text) || !/百万円/.test(compact(page.lines.slice(0,12).join(' ')))
      || /目次|[…]|\.{3}/.test(page.lines.slice(0,4).join(' '))) continue;
    const heading=page.lines.slice(0,12);
    const header=heading.find(line=>/前.*当|当.*前/.test(compact(line))&&line.length<160);
    const years=line=>[...new Set([...line.normalize('NFKC').matchAll(/(20\d{2})(?:年|\/)/g)].map(match=>Number(match[1])))];
    const dated=heading.find(line=>years(line).length===2);
    if (!header && !dated) continue;
    const headerDates=[...compact(page.lines.slice(0,10).join(' ')).matchAll(/(20\d{2})年(\d{1,2})月(\d{1,2})日/g)]
      .map(match=>`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`);
    if (headerDates.length && !headerDates.includes(period.periodEnd)) continue;
    const column=header ? (compact(header).indexOf('当')>compact(header).indexOf('前')?1:0) : years(dated)[1]>years(dated)[0]?1:0;
    const rows=[]; let group=null; let preceding='';
    for (const source of pages.slice(index,index+3)) {
      if (source!==page && /事業別|セグメント|注記事項|包括利益|貸借対照表/.test(compact(source.lines.slice(0,5).join(' ')))) break;
      for (const raw of source.lines) {
        const normalized=raw.normalize('NFKC').trim();
        const match=normalized.match(/^(.*?)\s*((?:[△▲−-]?\d[\d,]*(?:\.\d+)?|[－―—-])(?:\s+(?:[△▲−-]?\d[\d,]*(?:\.\d+)?|[－―—-])){1,3})$/);
        if (!match) {
          const label=compact(raw);
          if (/^(営業|投資|財務)活動(?:による|からの|に関する)キャッシュフロー$/.test(label)) group=label;
          preceding=label; continue;
        }
        const label=compact(match[1]) || preceding;
        if (!/[一-龠ぁ-んァ-ヶ]/.test(label)) continue;
        const value=number(match[2].trim().split(/\s+/)[column]??'');
        if (Number.isFinite(value)) rows.push({label,value,page:source.number,group});
        preceding='';
        if (/^現金.*同等物.*(?:期末|四半期末|中間期末)(?:の)?残高$/.test(label)) break;
      }
      if (rows.some(row=>/現金.*同等物.*(?:期末|四半期末|中間期末).*残高/.test(row.label))) break;
    }
    const pick=regex=>rows.find(row=>regex.test(row.label))?.value;
    const opening=pick(/^現金.*同等物.*期首(?:の)?残高$/);
    const closing=pick(/^現金.*同等物.*(?:期末|四半期末|中間期末)(?:の)?残高$/);
    const operating=pick(/^営業活動(?:による|からの|に関する)キャッシュフロー(?:合計|計)?(?:\(.*\))?$/)
      ?? pick(/^営業活動(?:から得た|に使用した)現金及び現金同等物\(純額\)$/);
    const investing=pick(/^投資活動(?:による|からの|に関する)キャッシュフロー(?:合計|計)?(?:\(.*\))?$/)
      ?? pick(/^投資活動(?:から得た|に使用した)現金及び現金同等物\(純額\)$/);
    const financing=pick(/^財務活動(?:による|からの|に関する)キャッシュフロー(?:合計|計)?(?:\(.*\))?$/)
      ?? pick(/^財務活動(?:から得た|に使用した)現金及び現金同等物\(純額\)$/);
    if (![opening,closing,operating,investing,financing].every(Number.isFinite) || opening<0 || closing<0) continue;
    const adjustments=rows.filter(row=>/為替.*(?:影響|換算)|換算差額|連結範囲.*(?:変動|変更)|新規連結|連結除外|売却目的|振替/.test(row.label));
    const adjustmentTotal=adjustments.reduce((sum,row)=>sum+row.value,0);
    const residual=closing-opening-operating-investing-financing-adjustmentTotal;
    return {...period,opening,closing,operating,investing,financing,adjustments,adjustmentTotal,residual,rows,
      sourcePages:[...new Set(rows.map(row=>row.page))]};
  }
  return null;
}

/** 概要: 期首現金と流入を、流出と期末現金へつなぐ保存則を満たす図に変換します。引数: cash - 百万円単位のCF。戻り値: 左右ノードと総額、必須値欠損時はnull。 */
export function buildCashFlow(cash) {
  if (!cash || ![cash.opening,cash.closing,cash.operating,cash.investing,cash.financing].every(Number.isFinite)
    || cash.opening<0 || cash.closing<0) return null;
  const sources=[],targets=[];
  const add=(label,value,kind='other')=>{
    if (Number.isFinite(value)&&value!==0) (value>0?sources:targets).push({label,value:Math.abs(value),signedValue:value,kind});
  };
  add('期首現金及び現金同等物',cash.opening,'revenue');
  add('営業キャッシュフロー',cash.operating,'profit');
  add('投資キャッシュフロー',cash.investing);
  add('財務キャッシュフロー',cash.financing);
  for (const row of cash.adjustments??[]) add(row.label,row.value);
  const remainder=cash.closing-cash.opening-cash.operating-cash.investing-cash.financing
    -(cash.adjustments??[]).reduce((sum,row)=>sum+row.value,0);
  add(Math.abs(remainder)<=3?'丸め差額（計算）':'未分類差額（計算）',remainder);
  if (cash.closing>0) targets.push({label:'期末現金及び現金同等物',value:cash.closing,kind:'revenue'});
  return {sources,targets,total:sources.reduce((sum,row)=>sum+row.value,0)};
}
