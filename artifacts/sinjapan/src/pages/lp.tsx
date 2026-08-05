import React from 'react';
import { Link } from 'wouter';

export default function LP() {
  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif" }}>

      {/* Header */}
      <header className="px-5 pt-6 pb-2">
        <span className="text-base font-bold tracking-tight text-gray-900">Chat LOGI</span>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="px-5 pt-4 pb-0 relative z-10">
          <h1 className="text-[2.35rem] font-black leading-[1.2] tracking-tight text-gray-900">
            チャットするだけ。<br />荷物が運べる。
          </h1>
          <p className="mt-3 text-[0.9rem] text-gray-500 leading-relaxed">
            電話も、車探しも、配車調整も。<br />
            面倒なことは、すべてお任せください。
          </p>
        </div>

        {/* Hero image + chat mock */}
        <div className="relative mt-4">
          {/* Hero photo */}
          <div className="relative">
            <img
              src={`${import.meta.env.BASE_URL}lp-hero.png`}
              alt="Chat LOGIを使う女性"
              className="w-full object-cover object-top"
              style={{ maxHeight: '520px', objectPosition: 'top center' }}
            />

            {/* Chat mockup overlay */}
            <div className="absolute left-4 top-4 w-[58%] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Mock header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-800">Chat LOGI</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>

              <div className="px-3 py-3 space-y-3">
                {/* User message */}
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 text-[0.7rem] leading-relaxed text-gray-700">
                    明日の午後、<br />東京から大阪へ<br />パレット3枚運びたいです。
                  </div>
                </div>

                {/* AI message */}
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[0.55rem] font-bold text-white">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 text-[0.7rem] leading-relaxed text-gray-700">
                      承知しました。<br />Chat LOGIが手配します。
                    </div>
                    <div className="flex gap-1 mt-1 ml-1">
                      <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                      <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                      <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                    </div>
                  </div>
                </div>

                {/* Completion notice */}
                <div className="border border-gray-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-gray-800">
                    <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    配車が完了しました。
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[0.65rem] text-gray-500">詳細を確認する</span>
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Input bar */}
                <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5">
                  <span className="flex-1 text-[0.65rem] text-gray-400">今日は何を運びましょうか？</span>
                  <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="absolute right-4 bottom-12 w-20 h-20 rounded-full bg-white shadow-lg border border-gray-100 flex flex-col items-center justify-center text-center">
              <span className="text-[0.55rem] text-gray-500 leading-tight">物流の<br />新しいカタチ。</span>
              <span className="text-[0.7rem] font-black text-gray-900 mt-0.5 leading-tight">Chat LOGI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature bar */}
      <section className="bg-white border-t border-gray-100 px-5 py-6">
        <div className="mb-5">
          <p className="text-base font-bold text-gray-900 leading-snug">大手運送会社と提携。</p>
          <p className="text-sm text-gray-500 mt-0.5">だから、最適な運賃をご提案できます。</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l3 3" />
                  <text x="9" y="14" className="text-xs" style={{ fontSize: '8px', fill: 'currentColor' }}>¥</text>
                </svg>
              ),
              label: '運賃比較もお任せ',
              sub: '最適な価格をご提案',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              label: '大手運送会社と提携',
              sub: '安心のネットワーク',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l3 1m6-1h-6m6 0l3-1V8l-3-1" />
                </svg>
              ),
              label: '配車まで一括対応',
              sub: '手間なくスピーディー',
            },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className="text-gray-700">{icon}</div>
              <div>
                <p className="text-[0.65rem] font-semibold text-gray-800 leading-snug">{label}</p>
                <p className="text-[0.6rem] text-gray-400 mt-0.5 leading-snug">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Partner logos */}
      <section className="bg-gray-50 border-t border-gray-100 px-5 py-5">
        <p className="text-[0.65rem] text-gray-400 mb-3">提携運送会社（一部抜粋）</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* ヤマト運輸 */}
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-sm bg-[#009844] flex items-center justify-center">
              <span className="text-white font-black text-[8px]">猫</span>
            </div>
            <span className="text-[0.7rem] font-bold text-gray-700">ヤマト運輸</span>
          </div>
          {/* SAGAWA */}
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-sm bg-[#e60012] flex items-center justify-center">
              <span className="text-white font-black text-[7px]">佐</span>
            </div>
            <span className="text-[0.7rem] font-bold text-gray-700 tracking-widest">SAGAWA</span>
          </div>
          {/* 日本通運 */}
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-sm bg-[#e60012] flex items-center justify-center">
              <span className="text-white font-black text-[6px]">通</span>
            </div>
            <span className="text-[0.7rem] font-bold text-gray-700">日本通運</span>
          </div>
          {/* 福山通運 */}
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-sm bg-[#003f8f] flex items-center justify-center">
              <span className="text-white font-black text-[6px]">福</span>
            </div>
            <span className="text-[0.7rem] font-bold text-gray-700">福山通運</span>
          </div>
          {/* SEINO */}
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-sm bg-[#e60012] flex items-center justify-center">
              <span className="text-white font-black text-[6px]">西</span>
            </div>
            <span className="text-[0.7rem] font-bold text-gray-700">SEINO西濃運輸</span>
          </div>
        </div>
        <p className="text-[0.6rem] text-gray-400 mt-3">※上記以外にも多数の運送会社と提携しています。</p>
      </section>

      {/* CTA */}
      <section className="px-5 py-8 bg-white">
        <Link href="/register">
          <button className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white text-base font-bold py-4 rounded-full hover:bg-gray-700 transition-colors">
            無料で相談する
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </Link>
        <p className="text-center text-[0.7rem] text-gray-400 mt-3">
          まずは話しかけるだけ。24時間いつでも相談OK！
        </p>
      </section>

    </div>
  );
}
