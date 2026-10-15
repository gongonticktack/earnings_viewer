import { translateText } from './i18n.js';
/** 概要: 現在の画面言語で文言を返します。引数: text - 日本語文言。戻り値: 表示文言。 */
function t(text) { return translateText(text, document.documentElement.lang); }

/** 概要: 企業追加希望を保存します。引数: values - 企業名と任意コード、send - HTTP送信関数。戻り値: 保存完了時に解決するPromise。 */
export async function submitCompanyRequest(values, send = fetch) {
  const response = await send('/api/company-requests', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('save failed');
}

/** 概要: 追加希望フォームの開閉と送信を設定します。引数: root - 対象DOM。戻り値: なし。 */
export function setupCompanyRequests(root = document) {
  const dialog = root.querySelector('#company-request-dialog');
  const form = root.querySelector('#company-request-form');
  const submit = root.querySelector('#company-request-submit');
  const status = root.querySelector('#company-request-status');
  let sending = false;
  root.querySelector('#company-request-open').addEventListener('click', () => {
    status.textContent = '';
    root.querySelector('#company-request-close').setAttribute('aria-label', t('閉じる'));
    dialog.showModal();
  });
  root.querySelector('#company-request-close').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    sending = true; submit.disabled = true;
    status.textContent = t('送信中…');
    try {
      await submitCompanyRequest({
        company_name: root.querySelector('#request-company-name').value.trim(),
        stock_code: root.querySelector('#request-stock-code').value.trim().normalize('NFKC').toUpperCase(),
      });
      form.reset(); status.textContent = t('追加希望を受け付けました。');
    } catch {
      status.textContent = t('保存できませんでした。入力を確認して、もう一度送信してください。');
    } finally { sending = false; submit.disabled = false; }
  });
}

if (typeof document !== 'undefined') setupCompanyRequests();
