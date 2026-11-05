/**
 * Ona Electric — Tools Manager API (Google Apps Script)
 * الخطوات:
 * 1) افتح الشيت → Extensions (الإضافات) → Apps Script → امسح الموجود والصق الملف ده كله.
 * 2) غيّر ACCESS_KEY تحت لكلمة سر من عندك (هتكتبها في البرنامج مرة على كل جهاز).
 * 3) من فوق اختار الدالة setup واضغط Run (أول مرة هيطلب صلاحيات → Allow).
 *    دي بتعمل التابات وتنزّل بيانات المعدات من ملف الإكسيل.
 * 4) Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy.
 *    انسخ رابط الـ Web app وحطه في البرنامج (الإعدادات) أو في config.js.
 */
const ACCESS_KEY = 'CHANGE_ME';

const SCHEMA = {
  tools:    {tab:'العدد',            cols:['id','code','name','brand','category','status','serial','purchaseDate','location','notes'],
             heads:['المعرف','كود المعدة','اسم المعدة','الماركة','النوع','الحالة','الرقم التسلسلي','تاريخ الشراء','مكان التخزين','ملاحظات']},
  people:   {tab:'الموظفون',         cols:['id','code','name','role','dept','phone','notes'],
             heads:['المعرف','كود الموظف','اسم الموظف','الوظيفة','القسم / الشركة','رقم الهاتف','ملاحظات']},
  projects: {tab:'المشاريع',         cols:['id','name','location','notes'],
             heads:['المعرف','اسم المشروع','الموقع','ملاحظات']},
  moves:    {tab:'حركة الخروج والعودة', cols:['id','formNo','type','toolId','toolCode','toolName','personId','personName','projectId','projectName','date','cond','notes'],
             heads:['المعرف','رقم الإذن','الحركة','معرف المعدة','كود المعدة','اسم المعدة','معرف الموظف','اسم الموظف','معرف المشروع','المشروع','التاريخ','الحالة عند العودة','ملاحظات']},
  cons:     {tab:'المستهلكات',       cols:['id','name','unit','brand','min','location'],
             heads:['المعرف','الصنف','الوحدة','الماركة','حد التنبيه %','مكان التخزين']},
  consLog:  {tab:'حركة المستهلكات',  cols:['id','consId','consName','type','qty','projectId','projectName','personId','personName','date'],
             heads:['المعرف','معرف الصنف','الصنف','الحركة','الكمية','معرف المشروع','المشروع','معرف الموظف','الموظف','التاريخ']},
  settings: {tab:'الإعدادات',        cols:['key','value'], heads:['المفتاح','القيمة']}
};

const SEED = {
"tools": [
[
"T0001",
"EQ-0001",
"عصا مبين جهد",
"تيواني",
"عدة كهربائية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0002",
"EQ-0002",
"نافخ هواء 600 وات",
"fit",
"عدة كهربائية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0003",
"EQ-0003",
"مطرقة 1250 جم",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0004",
"EQ-0004",
"شاكوش 300 جم",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0005",
"EQ-0005",
"طقم اللنكية نجمه ( 9 قطع )",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0006",
"EQ-0006",
"طقم اللنكية عاده ( 9 قطع )",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0007",
"EQ-0007",
"مقص كابلات صغير",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0008",
"EQ-0008",
"طقم مفكات (6 قطع) ( 3 صلبية ، 3عادة )",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0009",
"EQ-0009",
"طقم مفكات (2 قطع) ( 1 صلبية ، 1عادة )",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0010",
"EQ-0010",
"مفك اختبار ( 2 قطعه )",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0011",
"EQ-0011",
"طقم مفاتيح عاده ومشرشر ( 12 قطعه )",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0012",
"EQ-0012",
"طقم بيبه ( 4 قطع 10 ، 13 ، 17 ، 19 )",
"HARDEN",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0013",
"EQ-0013",
"مفتاح انجليزي 18 بوصة",
"HARDEN",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0014",
"EQ-0014",
"مفتاح فرنساوي 12 بوصة",
"HARDEN",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0015",
"EQ-0015",
"اجنه ( 2 قطعه عاده - مسمار )",
"APT",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0016",
"EQ-0016",
"5 جوانتي حماية",
"",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0017",
"EQ-0017",
"شنطة عدة معدنية",
"M&M",
"عدة يدوية",
"متاحة",
"",
"2026-11-02",
"مقر الشركة",
""
],
[
"T0018",
"EQ-0018",
"بنسة ترامل",
"crown",
"عدة كهربائية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0019",
"EQ-0019",
"3 بنسة كهرباء",
"total",
"عدة كهربائية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0020",
"EQ-0020",
"2 مفك تست",
"total",
"عدة كهربائية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0021",
"EQ-0021",
"قطر بالاسحلة",
"",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0022",
"EQ-0022",
"يد العزم",
"kraft",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0023",
"EQ-0023",
"طفم لقم",
"wiseman",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0024",
"EQ-0024",
"شريط لحام 12",
"",
"عدة كهربائية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0025",
"EQ-0025",
"فوم 3",
"",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0026",
"EQ-0026",
"شنطة قماش",
"total",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0027",
"EQ-0027",
"كمامات 2 علبة في 20",
"",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0028",
"EQ-0028",
"3 مجموعة ارضي",
"",
"عدة كهربائية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0029",
"EQ-0029",
"فوط 2 كيس 24 فوطة",
"",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0030",
"EQ-0030",
"WP40 2",
"",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
],
[
"T0031",
"EQ-0031",
"2 طقم ماكيته",
"total",
"عدة يدوية",
"متاحة",
"",
"2026-11-05",
"مقر الشركة",
""
]
],
"cons": [
[
"C0001",
"WP-40",
"علبة",
"تيواني",
20,
"مقر الشركة"
]
],
"consLog": [
[
"L0001",
"C0001",
"WP-40",
"توريد",
2,
"",
"",
"",
"",
"2026-11-02"
]
]
};

function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SCHEMA).forEach(k => {
    const s = SCHEMA[k];
    let sh = ss.getSheetByName(s.tab);
    if (!sh) sh = ss.insertSheet(s.tab);
    sh.getRange(1, 1, 1, s.heads.length).setValues([s.heads]).setFontWeight('bold').setBackground('#14223a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    sh.getRange('A:Z').setNumberFormat('@'); // نخزّن كل حاجة كنص
  });
  const put = (key, rows) => { const sh = ss.getSheetByName(SCHEMA[key].tab); if (sh.getLastRow() < 2 && rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows.map(r => r.map(String))); };
  put('tools', SEED.tools); put('cons', SEED.cons); put('consLog', SEED.consLog);
  put('settings', [['company','ONA Electric Industries'],['formNo','0'],['categories','عدة كهربائية,عدة يدوية,جهاز قياس,معدات سلامة,معدات ميكانيكية,مفكات,مفاتيح,ماكينات,بكر كابلات,أخرى']]);
  const s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('ورقة1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);
}

function readTable_(key) {
  const s = SCHEMA[key], sh = SpreadsheetApp.getActive().getSheetByName(s.tab);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, s.cols.length).getDisplayValues()
    .filter(r => r[0] !== '')
    .map(r => { const o = {}; s.cols.forEach((c, i) => o[c] = r[i]); return o; });
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  if ((e.parameter.key || '') !== ACCESS_KEY) return json_({ok:false, error:'bad_key'});
  const data = {};
  Object.keys(SCHEMA).forEach(k => data[k] = readTable_(k));
  return json_({ok:true, data});
}

function doPost(e) {
  let body; try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ok:false, error:'bad_json'}); }
  if ((body.key || '') !== ACCESS_KEY) return json_({ok:false, error:'bad_key'});
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive(); const out = {};
    if (body.action === 'nextFormNo') {
      const sh = ss.getSheetByName(SCHEMA.settings.tab), vals = sh.getDataRange().getValues();
      let row = vals.findIndex(r => r[0] === 'formNo');
      let n = row > 0 ? (parseInt(vals[row][1]) || 0) + 1 : 1;
      if (row > 0) sh.getRange(row + 1, 2).setValue(String(n)); else sh.appendRow(['formNo', String(n)]);
      out.formNo = n;
    }
    (body.ops || []).forEach(op => {
      const s = SCHEMA[op.table]; if (!s) return;
      if (op.row && op.row.formNo === '__NEW__') op.row.formNo = String(out.formNo);
      const sh = ss.getSheetByName(s.tab);
      const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
      const keyVal = op.table === 'settings' ? op.row.key : (op.id || (op.row && op.row.id));
      const idx = ids.indexOf(String(keyVal));
      if (op.op === 'upsert') {
        const vals = [s.cols.map(c => op.row[c] == null ? '' : String(op.row[c]))];
        if (idx >= 0) sh.getRange(idx + 2, 1, 1, s.cols.length).setValues(vals);
        else sh.getRange(sh.getLastRow() + 1, 1, 1, s.cols.length).setNumberFormat('@').setValues(vals);
      } else if (op.op === 'delete' && idx >= 0) {
        sh.deleteRow(idx + 2);
      }
    });
    return json_(Object.assign({ok:true}, out));
  } finally { lock.releaseLock(); }
}
