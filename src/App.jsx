import { useState } from "react";

// ─── 契約タイプ定義（説明・例付き）────────────────────────
const CONTRACT_TYPES = [
  {
    id: "A",
    label: "単発固定型",
    emoji: "🎯",
    desc: "1大会・固定額・固定割合",
    explain: "友だちのポーカー大会に「参加費を出してあげるよ」と約束するパターン。\n1回の大会だけが対象で、出す金額と、勝ったときの分け前があらかじめ決まっています。",
    example: "例）「明日の大会の参加費3万円を出す。賞金が入ったら50%をもらう」",
    fields: ["parties","tournament_single","investment_fixed","rebuy","distribution_fixed","payment","other"],
  },
  {
    id: "B",
    label: "シーズン通算型",
    emoji: "📅",
    desc: "期間内複数戦・赤字繰越",
    explain: "「今月は全部の大会を応援するよ」と期間まるごと出資するパターン。\n負けた分は次の大会に持ち越して、トータルで計算します。",
    example: "例）「1月〜3月の大会すべてに5万円出す。赤字は次戦に繰り越して、プラスになったら50%もらう」",
    fields: ["parties","tournament_period","investment_fixed","rebuy","bout_carryover","distribution_fixed","payment","other"],
  },
  {
    id: "C",
    label: "バックロール型",
    emoji: "💼",
    desc: "総資金を預ける・使った額ベースで清算",
    explain: "「財布ごと預けるから、好きな大会に使っていいよ」というパターン。\n出した総額のうち実際に使った分をもとに、賞金を分け合います。",
    example: "例）「$300（約4万円）預ける。使ったぶんの参加費に対して、賞金の50%をもらう」",
    fields: ["parties","tournament_period","investment_bankroll","rebuy","stoploss","settlement_timing","distribution_fixed","payment","other"],
  },
  {
    id: "D",
    label: "ROI連動型",
    emoji: "📈",
    desc: "大勝ちするほど競技者の取り分が増える",
    explain: "普通は50%の取り分が、大きく勝てば60%・70%に増えるパターン。\n「頑張ったご褒美」として競技者のモチベーションを上げる仕組みです。",
    example: "例）「基本は50%。でも賞金が参加費の2倍以上になったら55%、3倍以上なら60%あげる」",
    fields: ["parties","tournament_single","investment_fixed","rebuy","distribution_roi","payment","other"],
  },
  {
    id: "E",
    label: "ストップロス付き型",
    emoji: "🛑",
    desc: "損失上限を決めて自動終了",
    explain: "「負けが〇〇円を超えたら終わりにしよう」とあらかじめ決めておくパターン。\n出資者がどこまで損するかを決めておけるので安心です。",
    example: "例）「3ヶ月間・5万円出す。でも累計マイナスが3万円になった時点で終了」",
    fields: ["parties","tournament_period","investment_fixed","rebuy","bout_carryover","stoploss","distribution_fixed","payment","other"],
  },
];

// ─── 初期値 ───────────────────────────────────────────────
const INIT = {
  contractType: "",
  koName: "", koAddress: "",
  otsuName: "", otsuAddress: "",
  date: new Date().toISOString().slice(0, 10),
  tournamentName: "",
  tournamentPeriod: "",
  investment: "",
  markupEnabled: false, markup: "10",
  rebuyEnabled: "yes", rebuyPayer: "ko", rebuyLimit: "",
  boutCarryover: "yes",
  bankrollTotal: "", bankrollRefill: "no", bankrollEnd: "zero",
  stoplossEnabled: "yes", stoplossAmount: "",
  settlementTiming: "each",
  itamonePct: "50",
  expenseFirst: "yes",
  roiTiers: [{ threshold: "2", pct: "55" }, { threshold: "3", pct: "60" }],
  paymentTiming: "3days", paymentDays: "3", paymentMethod: "cash",
  forfeitRule: "no_refund",
  transferProhibit: "yes",
  agreementType: "text", contactLine: "",
  jurisdiction: "rakuchi", jurisdictionCustom: "",
};

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white";
const sel = inp;

function F({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

function Card({ children }) {
  return <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">{children}</div>;
}

function CardTitle({ icon, title }) {
  return <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><span>{icon}</span>{title}</h2>;
}

function NextBtn({ onClick, label = "次へ →" }) {
  return (
    <button onClick={onClick} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
      className="w-full py-3 rounded-xl text-white font-bold text-sm shadow hover:opacity-90 transition-opacity mt-2">
      {label}
    </button>
  );
}

// ─── ステップ定義 ─────────────────────────────────────────
// 契約タイプに応じて動的に生成
function buildSteps(typeId) {
  const type = CONTRACT_TYPES.find(t => t.id === typeId);
  if (!type) return [];
  return type.fields.map(f => f);
}

// ─── 契約書テキスト生成 ────────────────────────────────────
function genText(f, typeId) {
  const fmt = n => n ? Number(n).toLocaleString() : "　　　　";
  const payDays = f.paymentTiming === "same_day" ? "当日中" : f.paymentTiming === "3days" ? "３日以内" : f.paymentTiming === "7days" ? "７日以内" : `${f.paymentDays}日以内`;
  const payMethod = { cash: "現金", bank: "銀行振込", paypay: "PayPay", line: "LINE Pay" }[f.paymentMethod] || f.paymentMethod;
  const rebuyTxt = f.rebuyEnabled === "yes"
    ? `リバイ・アドオンは${f.rebuyPayer === "ko" ? "甲" : "甲乙折半"}が負担する。${f.rebuyLimit ? `上限${fmt(f.rebuyLimit)}円。` : "上限なし。"}`
    : "リバイ・アドオンは認めない。";
  const forfeitTxt = f.forfeitRule === "no_refund" ? "乙の都合による棄権・途中離脱の場合、出資金の返還は行わない。" : "乙の都合による棄権の場合、消化割合に応じて出資金を按分清算する。";
  const transferTxt = f.transferProhibit === "yes" ? "甲乙ともに本契約上の権利・義務を第三者に譲渡することを禁じる。" : "甲乙の合意により第三者への譲渡を認める。";
  const agreeTxt = f.agreementType === "text"
    ? `本契約は甲乙間のメッセージ（${f.contactLine || "LINE等"}）での合意をもって成立し、署名・押印は要しない。`
    : "本契約は甲乙双方の署名をもって成立する。";
  const jurisTxt = f.jurisdiction === "rakuchi" ? "甲の住所地を管轄する裁判所を合意管轄とする。" : `${f.jurisdictionCustom || "　　　　"}地方裁判所を合意管轄とする。`;
  const markup = f.markupEnabled ? `（マークアップ ${f.markup}%含む）` : "";
  const expenseTxt = f.expenseFirst === "yes" ? "賞金から参加費・諸経費を先に控除した後、残額を分配する。" : "賞金をそのまま分配する。";

  let articles = [];
  let artNo = 1;
  const A = (title, body) => { articles.push(`第${artNo}条（${title}）\n${body}`); artNo++; };

  if (typeId === "A") {
    A("対象トーナメント", `大会名：${f.tournamentName || "　　　　　　"}`);
    A("出資", `甲は乙に対し金${fmt(f.investment)}円${markup}を出資する。`);
    A("リバイ・アドオン", rebuyTxt);
    A("分配", `${expenseTxt}\n賞金の${100 - Number(f.itamonePct)}％を甲に、${f.itamonePct}％を乙に分配する。インマネしなかった場合、乙への支払いは発生しない。`);
    A("支払い", `乙はインマネ確定後${payDays}に${payMethod}にて甲への分配金を支払う。`);
  } else if (typeId === "B") {
    A("対象期間・トーナメント", `対象期間：${f.tournamentPeriod || "　　　〜　　　"}\n期間内に乙が参加するトーナメント全戦を対象とする。`);
    A("出資", `甲は乙に対し金${fmt(f.investment)}円${markup}を出資する。`);
    A("リバイ・アドオン", rebuyTxt);
    A("バウト処理", `前戦の損益は次戦に繰り越す${f.boutCarryover === "yes" ? "（赤字繰越あり）" : "（都度清算）"}ものとする。`);
    A("分配", `${expenseTxt}\n賞金の${100 - Number(f.itamonePct)}％を甲に、${f.itamonePct}％を乙に分配する。`);
    A("支払い", `各インマネ確定後${payDays}に${payMethod}にて支払う。`);
  } else if (typeId === "C") {
    A("対象期間", `対象期間：${f.tournamentPeriod || "　　　〜　　　"}`);
    A("出資（バックロール）", `甲は乙に対し総額${fmt(f.bankrollTotal)}円を預ける。${f.bankrollRefill === "yes" ? "残高ゼロ時、甲は追加出資することができる。" : "使い切り次第終了とする。"}\n終了条件：${f.bankrollEnd === "zero" ? "残高ゼロ" : f.bankrollEnd === "period" ? "期間終了" : "甲乙合意時"}`);
    A("リバイ・アドオン", rebuyTxt);
    if (f.stoplossEnabled === "yes") A("ストップロス", `累計損失が${fmt(f.stoplossAmount)}円に達した時点で本契約を自動終了とする。`);
    A("清算タイミング", f.settlementTiming === "each" ? "インマネのたびに都度清算する。" : "契約終了時にまとめて精算する。");
    A("分配", `使用した出資額を基準として、賞金の${100 - Number(f.itamonePct)}％を甲に、${f.itamonePct}％を乙に分配する。`);
    A("支払い", `清算後${payDays}に${payMethod}にて支払う。`);
  } else if (typeId === "D") {
    A("対象トーナメント", `大会名：${f.tournamentName || "　　　　　　"}`);
    A("出資", `甲は乙に対し金${fmt(f.investment)}円${markup}を出資する。`);
    A("リバイ・アドオン", rebuyTxt);
    const roiRows = f.roiTiers.map(t => `  ROI ${t.threshold}倍以上：乙の取り分 ${t.pct}%`).join("\n");
    A("分配（ROI連動）", `基本：賞金の${100 - Number(f.itamonePct)}％を甲に、${f.itamonePct}％を乙に分配する。\nROI（賞金÷出資額）に応じて乙の取り分を以下のとおり変動させる：\n${roiRows}`);
    A("支払い", `乙はインマネ確定後${payDays}に${payMethod}にて甲への分配金を支払う。`);
  } else if (typeId === "E") {
    A("対象期間・トーナメント", `対象期間：${f.tournamentPeriod || "　　　〜　　　"}\n期間内に乙が参加するトーナメント全戦を対象とする。`);
    A("出資", `甲は乙に対し金${fmt(f.investment)}円${markup}を出資する。`);
    A("リバイ・アドオン", rebuyTxt);
    A("バウト処理", `前戦の損益は次戦に繰り越す${f.boutCarryover === "yes" ? "（赤字繰越あり）" : "（都度清算）"}ものとする。`);
    A("ストップロス", `累計損失が${fmt(f.stoplossAmount)}円に達した時点で本契約を自動終了とする。`);
    A("分配", `${expenseTxt}\n賞金の${100 - Number(f.itamonePct)}％を甲に、${f.itamonePct}％を乙に分配する。`);
    A("支払い", `各インマネ確定後${payDays}に${payMethod}にて支払う。`);
  }

  A("棄権・途中離脱", forfeitTxt);
  A("譲渡禁止", transferTxt);
  A("合意方法", agreeTxt);
  A("管轄", jurisTxt);

  const typeName = CONTRACT_TYPES.find(t => t.id === typeId)?.label || "";
  return `ポーカーステーキング契約書（${typeName}）\n\n甲（出資者）：${f.koName || "　　　　　　"}　住所：${f.koAddress || "　　　　　　　　　　"}\n乙（競技者）：${f.otsuName || "　　　　　　"}　住所：${f.otsuAddress || "　　　　　　　　　　"}\n締結日：${f.date}\n\n甲および乙は、以下の条件にてポーカーステーキング契約を締結する。\n\n${articles.join("\n\n")}\n\n以上`;
}

// ─── 各ステップのUI ───────────────────────────────────────

function StepTypeSelect({ form, set, onNext }) {
  const selected = CONTRACT_TYPES.find(t => t.id === form.contractType);
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="🃏" title="どのタイプの契約ですか？" />
        <p className="text-xs text-slate-500">タップすると説明が表示されます</p>
        <div className="flex flex-col gap-2">
          {CONTRACT_TYPES.map(t => {
            const isSelected = form.contractType === t.id;
            return (
              <button key={t.id} onClick={() => set("contractType", t.id)}
                style={{ display: "block", width: "100%", textAlign: "left" }}
                className={`rounded-xl border-2 transition-all overflow-hidden ${isSelected ? "border-emerald-400" : "border-slate-100"}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: isSelected ? "#ecfdf5" : "#f8fafc" }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{t.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "bold", color: "#1e293b", fontSize: 14 }}>{t.label}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{t.desc}</div>
                  </div>
                  <span style={{ color: "#94a3b8", fontSize: 18, flexShrink: 0, transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </div>
                {isSelected && (
                  <div style={{ padding: "12px 16px", background: "#ffffff", borderTop: "1px solid #d1fae5" }}>
                    <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-line", marginBottom: 8 }}>{t.explain}</p>
                    <div style={{ background: "#ecfdf5", borderRadius: 8, padding: "8px 12px" }}>
                      <p style={{ fontSize: 12, color: "#065f46", fontWeight: 500 }}>{t.example}</p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>
      {selected && (
        <NextBtn onClick={onNext} label={`「${selected.label}」で進む →`} />
      )}
    </div>
  );
}

function StepParties({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="👤" title="当事者の情報" />
        <div className="bg-blue-50 rounded-xl px-3 py-2 mb-1">
          <p className="text-xs text-blue-700">💡 <b>甲</b>=お金を出す人（出資者）　<b>乙</b>=ポーカーをする人（競技者）</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="甲（出資者）氏名"><input className={inp} value={form.koName} onChange={e => set("koName", e.target.value)} placeholder="山田 太郎" /></F>
          <F label="乙（競技者）氏名"><input className={inp} value={form.otsuName} onChange={e => set("otsuName", e.target.value)} placeholder="鈴木 一郎" /></F>
        </div>
        <F label="甲の住所" hint="省略可（LINEでの合意の場合は不要）">
          <input className={inp} value={form.koAddress} onChange={e => set("koAddress", e.target.value)} placeholder="富山県富山市〇〇" />
        </F>
        <F label="乙の住所" hint="省略可">
          <input className={inp} value={form.otsuAddress} onChange={e => set("otsuAddress", e.target.value)} placeholder="東京都渋谷区〇〇" />
        </F>
        <F label="締結日">
          <input type="date" className={inp} value={form.date} onChange={e => set("date", e.target.value)} />
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepTournamentSingle({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="🏆" title="対象の大会" />
        <F label="大会名" hint="参加する大会の名前を入れてください">
          <input className={inp} value={form.tournamentName} onChange={e => set("tournamentName", e.target.value)} placeholder="〇〇ポーカーオープン" />
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepTournamentPeriod({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="📅" title="対象期間" />
        <div className="bg-blue-50 rounded-xl px-3 py-2">
          <p className="text-xs text-blue-700">💡 この期間中に乙が参加する大会がすべて対象になります</p>
        </div>
        <F label="期間">
          <input className={inp} value={form.tournamentPeriod} onChange={e => set("tournamentPeriod", e.target.value)} placeholder="2025年1月〜2025年3月" />
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepInvestmentFixed({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="💴" title="出資額" />
        <F label="出資額（円）" hint="甲が乙に渡す参加費の金額">
          <input type="number" className={inp} value={form.investment} onChange={e => set("investment", e.target.value)} placeholder="30000" />
        </F>
        <F label="マークアップ" hint="出資額に上乗せする手数料のこと。なしが一般的">
          <select className={sel} value={form.markupEnabled ? "yes" : "no"} onChange={e => set("markupEnabled", e.target.value === "yes")}>
            <option value="no">なし</option>
            <option value="yes">あり</option>
          </select>
        </F>
        {form.markupEnabled && (
          <F label="マークアップ率（%）" hint="例：10と入れると出資額の10%上乗せ">
            <input type="number" className={inp} value={form.markup} onChange={e => set("markup", e.target.value)} placeholder="10" />
          </F>
        )}
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepInvestmentBankroll({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="💼" title="バックロール（預け金）" />
        <div className="bg-blue-50 rounded-xl px-3 py-2">
          <p className="text-xs text-blue-700">💡 財布ごと渡すイメージ。乙はこの中から参加費を使います</p>
        </div>
        <F label="預け総額（円）">
          <input type="number" className={inp} value={form.bankrollTotal} onChange={e => set("bankrollTotal", e.target.value)} placeholder="100000" />
        </F>
        <F label="残高ゼロになったら？">
          <select className={sel} value={form.bankrollRefill} onChange={e => set("bankrollRefill", e.target.value)}>
            <option value="no">そこで終わり（追加なし）</option>
            <option value="yes">甲が追加出資できる</option>
          </select>
        </F>
        <F label="終了条件">
          <select className={sel} value={form.bankrollEnd} onChange={e => set("bankrollEnd", e.target.value)}>
            <option value="zero">残高ゼロになったとき</option>
            <option value="period">期間が終わったとき</option>
            <option value="agreement">甲乙が終わりと合意したとき</option>
          </select>
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepRebuy({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="🔄" title="リバイ・アドオン" />
        <div className="bg-blue-50 rounded-xl px-3 py-2">
          <p className="text-xs text-blue-700">💡 リバイ＝途中で追加の参加費を払うこと。アドオン＝チップ補充のお金</p>
        </div>
        <F label="リバイ・アドオンを認めますか？">
          <select className={sel} value={form.rebuyEnabled} onChange={e => set("rebuyEnabled", e.target.value)}>
            <option value="yes">認める</option>
            <option value="no">認めない（初回参加費のみ）</option>
          </select>
        </F>
        {form.rebuyEnabled === "yes" && <>
          <F label="誰が払う？">
            <select className={sel} value={form.rebuyPayer} onChange={e => set("rebuyPayer", e.target.value)}>
              <option value="ko">甲（出資者）が全額払う</option>
              <option value="split">甲と乙で折半</option>
            </select>
          </F>
          <F label="上限額（円）" hint="空欄にすると無制限になります">
            <input type="number" className={inp} value={form.rebuyLimit} onChange={e => set("rebuyLimit", e.target.value)} placeholder="空欄で無制限" />
          </F>
        </>}
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepBoutCarryover({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="↩️" title="負けた分の扱い（赤字繰越）" />
        <div className="bg-blue-50 rounded-xl px-3 py-2">
          <p className="text-xs text-blue-700">💡 赤字繰越あり＝負けた分を次の大会に持ち越してトータルで計算。なし＝大会ごとに別々に計算</p>
        </div>
        <F label="赤字繰越">
          <select className={sel} value={form.boutCarryover} onChange={e => set("boutCarryover", e.target.value)}>
            <option value="yes">あり（シーズン全体で通算）</option>
            <option value="no">なし（大会ごとに清算）</option>
          </select>
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepStoploss({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="🛑" title="ストップロス（損失の上限）" />
        <div className="bg-blue-50 rounded-xl px-3 py-2">
          <p className="text-xs text-blue-700">💡 「これ以上は負けたくない」という金額を決めておけます。超えたら自動で契約終了</p>
        </div>
        <F label="ストップロスを設定しますか？">
          <select className={sel} value={form.stoplossEnabled} onChange={e => set("stoplossEnabled", e.target.value)}>
            <option value="yes">設定する</option>
            <option value="no">設定しない</option>
          </select>
        </F>
        {form.stoplossEnabled === "yes" && (
          <F label="損失上限額（円）" hint="累計でこの金額を超えたら終了">
            <input type="number" className={inp} value={form.stoplossAmount} onChange={e => set("stoplossAmount", e.target.value)} placeholder="30000" />
          </F>
        )}
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepSettlementTiming({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="🔖" title="清算のタイミング" />
        <div className="bg-blue-50 rounded-xl px-3 py-2">
          <p className="text-xs text-blue-700">💡 インマネ（賞金獲得）するたびに払うか、最後にまとめて払うかを決めます</p>
        </div>
        <F label="清算タイミング">
          <select className={sel} value={form.settlementTiming} onChange={e => set("settlementTiming", e.target.value)}>
            <option value="each">インマネのたびに都度払う</option>
            <option value="end">契約終了時にまとめて払う</option>
          </select>
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepDistributionFixed({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="📊" title="賞金の分け方" />
        <F label="経費の扱い" hint="参加費などを先に引くかどうか">
          <select className={sel} value={form.expenseFirst} onChange={e => set("expenseFirst", e.target.value)}>
            <option value="yes">参加費などを先に引いてから分ける</option>
            <option value="no">賞金をそのまま分ける</option>
          </select>
        </F>
        <F label="乙（競技者）の取り分">
          <div className="flex items-center gap-3 mt-1">
            <input type="range" min="10" max="90" step="5" value={form.itamonePct}
              onChange={e => set("itamonePct", e.target.value)} className="flex-1 accent-emerald-500" />
            <span className="text-emerald-500 font-bold text-xl w-14 text-right">{form.itamonePct}%</span>
          </div>
          <div className="flex justify-between mt-2">
            <div className="bg-slate-100 rounded-lg px-3 py-2 text-center flex-1 mr-2">
              <div className="text-xs text-slate-500">甲（出資者）</div>
              <div className="font-bold text-slate-700">{100 - Number(form.itamonePct)}%</div>
            </div>
            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-center flex-1">
              <div className="text-xs text-emerald-600">乙（競技者）</div>
              <div className="font-bold text-emerald-600">{form.itamonePct}%</div>
            </div>
          </div>
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepDistributionROI({ form, set, onNext, onBack }) {
  const updateTier = (i, key, val) => {
    const tiers = [...form.roiTiers];
    tiers[i] = { ...tiers[i], [key]: val };
    set("roiTiers", tiers);
  };
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="📈" title="賞金の分け方（ROI連動）" />
        <div className="bg-blue-50 rounded-xl px-3 py-2">
          <p className="text-xs text-blue-700">💡 ROI＝賞金÷参加費。大きく勝つほど乙の取り分が増える仕組みです</p>
        </div>
        <F label="基本の乙の取り分">
          <div className="flex items-center gap-3 mt-1">
            <input type="range" min="10" max="90" step="5" value={form.itamonePct}
              onChange={e => set("itamonePct", e.target.value)} className="flex-1 accent-emerald-500" />
            <span className="text-emerald-500 font-bold text-xl w-14 text-right">{form.itamonePct}%</span>
          </div>
        </F>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">ボーナスティア（大勝ちしたときの特典）</label>
          {form.roiTiers.map((t, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center bg-slate-50 rounded-lg p-2">
              <span className="text-xs text-slate-500 shrink-0">ROI</span>
              <input type="number" className={inp} value={t.threshold} onChange={e => updateTier(i, "threshold", e.target.value)} placeholder="倍率" />
              <span className="text-xs text-slate-500 shrink-0">倍以上 →</span>
              <input type="number" className={inp} value={t.pct} onChange={e => updateTier(i, "pct", e.target.value)} placeholder="乙%" />
              <span className="text-xs text-slate-500 shrink-0">%</span>
            </div>
          ))}
        </div>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepPayment({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="💳" title="支払い条件" />
        <F label="支払いのタイミング" hint="インマネ確定後、いつ払う？">
          <select className={sel} value={form.paymentTiming} onChange={e => set("paymentTiming", e.target.value)}>
            <option value="same_day">当日中</option>
            <option value="3days">３日以内</option>
            <option value="7days">７日以内</option>
            <option value="custom">日数を指定する</option>
          </select>
        </F>
        {form.paymentTiming === "custom" && (
          <F label="日数">
            <input type="number" className={inp} value={form.paymentDays} onChange={e => set("paymentDays", e.target.value)} placeholder="14" />
          </F>
        )}
        <F label="支払い方法">
          <select className={sel} value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
            <option value="cash">現金</option>
            <option value="bank">銀行振込</option>
            <option value="paypay">PayPay</option>
            <option value="line">LINE Pay</option>
          </select>
        </F>
      </Card>
      <NextBtn onClick={onNext} />
      <BackBtn onClick={onBack} />
    </div>
  );
}

function StepOther({ form, set, onGenerate, onBack }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon="📋" title="その他の条件" />
        <F label="棄権・途中離脱" hint="乙が自分の都合でやめた場合">
          <select className={sel} value={form.forfeitRule} onChange={e => set("forfeitRule", e.target.value)}>
            <option value="no_refund">出資金は返さない</option>
            <option value="proportional">消化した割合で按分して返す</option>
          </select>
        </F>
        <F label="持ち分の譲渡" hint="権利を他の人に売ったり渡したりすること">
          <select className={sel} value={form.transferProhibit} onChange={e => set("transferProhibit", e.target.value)}>
            <option value="yes">禁止する</option>
            <option value="no">甲乙が合意すれば認める</option>
          </select>
        </F>
        <F label="どうやって合意しますか？">
          <select className={sel} value={form.agreementType} onChange={e => set("agreementType", e.target.value)}>
            <option value="text">LINEなどのメッセージで合意</option>
            <option value="sign">紙に署名して合意</option>
          </select>
        </F>
        {form.agreementType === "text" && (
          <F label="連絡先（LINE IDなど）">
            <input className={inp} value={form.contactLine} onChange={e => set("contactLine", e.target.value)} placeholder="@username" />
          </F>
        )}
        <F label="もめたときの裁判所" hint="万が一のときの管轄">
          <select className={sel} value={form.jurisdiction} onChange={e => set("jurisdiction", e.target.value)}>
            <option value="rakuchi">甲の住所地</option>
            <option value="custom">場所を指定する</option>
          </select>
        </F>
        {form.jurisdiction === "custom" && (
          <F label="場所">
            <input className={inp} value={form.jurisdictionCustom} onChange={e => set("jurisdictionCustom", e.target.value)} placeholder="東京" />
          </F>
        )}
      </Card>
      <button onClick={onGenerate}
        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
        className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:opacity-90 transition-opacity">
        📄　契約書を生成する
      </button>
      <BackBtn onClick={onBack} />
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-full py-2 rounded-xl text-slate-400 text-sm hover:text-slate-600 transition-colors">
      ← 前に戻る
    </button>
  );
}

// ─── ステップ順序ビルダー ─────────────────────────────────
function buildStepKeys(typeId) {
  const type = CONTRACT_TYPES.find(t => t.id === typeId);
  return type ? type.fields : [];
}

// ─── メイン ───────────────────────────────────────────────
export default function App() {
  const [form, setForm] = useState(INIT);
  const [stepIndex, setStepIndex] = useState(0); // 0=タイプ選択
  const [preview, setPreview] = useState(false);
  const [contractText, setContractText] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const stepKeys = form.contractType ? ["type", ...buildStepKeys(form.contractType)] : ["type"];
  const currentKey = stepKeys[stepIndex] || "type";
  const totalSteps = stepKeys.length;

  const next = () => setStepIndex(i => Math.min(i + 1, totalSteps - 1));
  const back = () => setStepIndex(i => Math.max(i - 1, 0));

  const handleGenerate = () => {
    const text = genText(form, form.contractType);
    setContractText(text);
    setPreview(true);
  };

  const handleDownloadPDF = async () => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    document.head.appendChild(script);
    await new Promise(r => script.onload = r);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const canvas = document.createElement("canvas");
    canvas.width = 794; canvas.height = 1123;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a2e";
    const lines = contractText.split("\n");
    let y = 55;
    lines.forEach((line, i) => {
      if (y > 1080) return;
      if (i === 0) { ctx.font = "bold 17px sans-serif"; ctx.fillText(line, 40, y); y += 34; ctx.font = "13px sans-serif"; }
      else if (line.match(/^第[０-９\d]+条/)) { ctx.font = "bold 13px sans-serif"; ctx.fillText(line, 40, y); y += 24; ctx.font = "13px sans-serif"; }
      else { ctx.fillText(line, 40, y); y += 21; }
    });
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", 0, 0, 210, 297);
    doc.save("ステーキング契約書.pdf");
  };

  const renderStep = () => {
    switch (currentKey) {
      case "type": return <StepTypeSelect form={form} set={set} onNext={next} />;
      case "parties": return <StepParties form={form} set={set} onNext={next} onBack={back} />;
      case "tournament_single": return <StepTournamentSingle form={form} set={set} onNext={next} onBack={back} />;
      case "tournament_period": return <StepTournamentPeriod form={form} set={set} onNext={next} onBack={back} />;
      case "investment_fixed": return <StepInvestmentFixed form={form} set={set} onNext={next} onBack={back} />;
      case "investment_bankroll": return <StepInvestmentBankroll form={form} set={set} onNext={next} onBack={back} />;
      case "rebuy": return <StepRebuy form={form} set={set} onNext={next} onBack={back} />;
      case "bout_carryover": return <StepBoutCarryover form={form} set={set} onNext={next} onBack={back} />;
      case "stoploss": return <StepStoploss form={form} set={set} onNext={next} onBack={back} />;
      case "settlement_timing": return <StepSettlementTiming form={form} set={set} onNext={next} onBack={back} />;
      case "distribution_fixed": return <StepDistributionFixed form={form} set={set} onNext={next} onBack={back} />;
      case "distribution_roi": return <StepDistributionROI form={form} set={set} onNext={next} onBack={back} />;
      case "payment": return <StepPayment form={form} set={set} onNext={next} onBack={back} />;
      case "other": return <StepOther form={form} set={set} onGenerate={handleGenerate} onBack={back} />;
      default: return null;
    }
  };

  const stepLabel = {
    type: "契約タイプ", parties: "当事者情報", tournament_single: "大会",
    tournament_period: "期間", investment_fixed: "出資額", investment_bankroll: "バックロール",
    rebuy: "リバイ", bout_carryover: "赤字繰越", stoploss: "ストップロス",
    settlement_timing: "清算", distribution_fixed: "配分", distribution_roi: "配分",
    payment: "支払い", other: "その他",
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", minHeight: "100vh" }} className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🃏</div>
          <h1 className="text-2xl font-bold text-white mb-1">ステーキング契約書</h1>
          <p className="text-slate-400 text-sm">ジェネレーター</p>
        </div>

        {!preview ? (
          <>
            {/* プログレスバー */}
            {form.contractType && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{stepLabel[currentKey] || ""}</span>
                  <span>{stepIndex + 1} / {totalSteps}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
                </div>
              </div>
            )}
            {renderStep()}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">📄 契約書プレビュー</h2>
              <pre style={{ fontFamily: "'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif", fontSize: 13, lineHeight: 2, whiteSpace: "pre-wrap", color: "#1e293b", textAlign: "left", wordBreak: "break-all", background: "#f8fafc", borderRadius: 12, padding: 16 }}>
                {contractText}
              </pre>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleDownloadPDF}
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                className="py-3 rounded-xl text-white font-bold text-sm shadow hover:opacity-90 transition-opacity">
                ⬇️　PDFダウンロード
              </button>
              <button onClick={() => navigator.clipboard.writeText(contractText)}
                className="py-3 rounded-xl text-slate-700 font-bold text-sm border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                📋　テキストコピー
              </button>
            </div>
            <button onClick={() => { setPreview(false); setStepIndex(totalSteps - 1); }}
              className="w-full py-3 rounded-xl text-slate-500 text-sm hover:text-slate-700 transition-colors">
              ← 編集に戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}