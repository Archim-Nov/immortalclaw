import React from "react";

export interface AgentLifeMessage {
  id: string;
  from: string;
  tick: number;
  subject: string;
  body: string;
}

export interface AgentLifeAct {
  id: string;
  kind: "见闻" | "交手";
  title: string;
  tick: number;
  body: string;
}

export function AgentLifePreview(props: {
  location: string;
  action: string;
  realmLabel: string;
  sect: string | null;
  messages: AgentLifeMessage[];
  acts: AgentLifeAct[];
}) {
  const { location, action, realmLabel, sect, messages, acts } = props;

  return (
    <section className="life-preview" lang="zh-CN" aria-label="行止与近事">
      <h2>行止</h2>
      <dl className="life-preview-facts">
        <div>
          <dt>所在</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt>此刻</dt>
          <dd>{action}</dd>
        </div>
        <div>
          <dt>境界</dt>
          <dd>{realmLabel}</dd>
        </div>
        <div>
          <dt>宗门</dt>
          <dd>{sect?.trim() || "散修"}</dd>
        </div>
      </dl>

      <h2>传音</h2>
      {messages.length === 0 ? (
        <p className="life-preview-empty">尚无传音。</p>
      ) : (
        <ol className="life-preview-list">
          {messages.map((message) => (
            <li key={message.id}>
              <div className="life-preview-meta">
                <span>{message.from}</span>
                <span>刻 {message.tick}</span>
              </div>
              {message.subject ? <div className="life-preview-subject">{message.subject}</div> : null}
              <p>{message.body}</p>
            </li>
          ))}
        </ol>
      )}

      <h2>近事</h2>
      {acts.length === 0 ? (
        <p className="life-preview-empty">这一阵没有记下什么事。</p>
      ) : (
        <ol className="life-preview-list">
          {acts.map((act) => (
            <li key={act.id}>
              <div className="life-preview-meta">
                <span>{act.kind} · {act.title}</span>
                <span>刻 {act.tick}</span>
              </div>
              <p>{act.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
