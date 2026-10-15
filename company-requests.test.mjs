import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitCompanyRequest } from './company-requests.js';

test('希望をJSONで送信し保存成功を確認する', async () => {
  await submitCompanyRequest({company_name:'任天堂',stock_code:'7974'}, async (url, options) => {
    assert.equal(url,'/api/company-requests'); assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{company_name:'任天堂',stock_code:'7974'});
    return new Response(null,{status:201});
  });
});
test('保存失敗を成功扱いにしない', async () => {
  await assert.rejects(submitCompanyRequest({company_name:'任天堂'},async () => new Response(null,{status:503})));
});
