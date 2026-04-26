"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/api";

const INSTRUCTIONS = [
  "练习约会开场白",
  "模拟职场 networking 场景",
  "改善沟通技巧",
  "克服社交焦虑",
];

const FREE_USES_LIMIT = 3;
const USES_STORAGE_KEY = "social-coach-uses";

const MONTHLY_PRICE_ID = "price_monthly_placeholder";
const YEARLY_PRICE_ID = "price_yearly_placeholder";

interface SubscriptionModalProps {
  onClose: () => void;
}

function SubscriptionModal({ onClose }: SubscriptionModalProps) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  const subscribe = async (priceId: string, plan: "monthly" | "yearly") => {
    setLoading(plan);
    // Track: user selected plan, about to redirect to Stripe
    const event = {
      event: "plan_selected",
      plan,
      priceId,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("payment_event", JSON.stringify(event));
    console.log("[Tracking] plan_selected", event);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        // Track: redirecting to Stripe
        const redirectEvent = {
          event: "stripe_redirect",
          plan,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem("payment_event", JSON.stringify(redirectEvent));
        console.log("[Tracking] stripe_redirect", redirectEvent);
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
          <div className="text-3xl mb-2">🚀</div>
          <h2 className="text-xl font-bold">解锁 Pro 模式</h2>
          <p className="text-blue-100 text-sm mt-1">
            你已用完 {FREE_USES_LIMIT} 次免费练习
          </p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3">
          {/* Yearly plan - highlighted */}
          <button
            onClick={() => {
              // Track: upgrade button click (yearly)
              const event = { event: "upgrade_click", plan: "yearly", timestamp: new Date().toISOString() };
              localStorage.setItem("payment_event", JSON.stringify(event));
              console.log("[Tracking] upgrade_click", event);
              subscribe(YEARLY_PRICE_ID, "yearly");
            }}
            disabled={loading !== null}
            className="w-full border-2 border-blue-600 rounded-2xl p-4 text-left hover:bg-blue-50 transition-colors relative disabled:opacity-60"
          >
            <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              省 $71
            </div>
            <div className="font-bold text-gray-900 text-base">年付 $49</div>
            <div className="text-sm text-gray-500 mt-0.5">$4.08/月 · 比月付省 $70.88</div>
            {loading === "yearly" && (
              <span className="text-blue-600 text-sm mt-1 block">跳转中...</span>
            )}
          </button>

          {/* Monthly plan */}
          <button
            onClick={() => {
              // Track: upgrade button click (monthly)
              const event = { event: "upgrade_click", plan: "monthly", timestamp: new Date().toISOString() };
              localStorage.setItem("payment_event", JSON.stringify(event));
              console.log("[Tracking] upgrade_click", event);
              subscribe(MONTHLY_PRICE_ID, "monthly");
            }}
            disabled={loading !== null}
            className="w-full border border-gray-200 rounded-2xl p-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <div className="font-bold text-gray-900 text-base">订阅月付 $9.99</div>
            <div className="text-sm text-gray-500 mt-0.5">随时取消</div>
            {loading === "monthly" && (
              <span className="text-gray-500 text-sm mt-1 block">跳转中...</span>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            暂不升级
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>("约会开场白");
  const [error, setError] = useState("");
  const [useCount, setUseCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(USES_STORAGE_KEY);
    setUseCount(stored ? parseInt(stored, 10) : 0);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "zh-CN";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setError("语音识别出错，请输入文字");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current) {
      setError("");
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      setError("浏览器不支持语音识别，请输入文字");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (text?: string) => {
    const content = text || inputText.trim();
    if (!content) return;

    const newCount = useCount + 1;
    if (newCount > FREE_USES_LIMIT) {
      setShowPaywall(true);
      return;
    }

    localStorage.setItem(USES_STORAGE_KEY, String(newCount));
    setUseCount(newCount);

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data = await res.json();

      if (data.reply) {
        const assistantMessage: Message = { role: "assistant", content: data.reply };
        setMessages((prev) => [...prev, assistantMessage]);
        speak(data.reply);
      } else {
        setError("回复出错，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    speechSynthesis.cancel();
  };

  const remainingUses = Math.max(0, FREE_USES_LIMIT - useCount);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {showPaywall && <SubscriptionModal onClose={() => setShowPaywall(false)} />}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">🎯 社交教练</h1>
          <p className="text-sm text-gray-500 mt-1">AI 陪你练习，给你真实反馈</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-6">
        {/* Free uses banner */}
        {remainingUses > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
            <span>🎁</span>
            <span>剩余免费次数：<strong>{remainingUses}</strong> 次</span>
          </div>
        )}

        {/* Scenario Selector */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">选择练习场景</label>
          <div className="flex flex-wrap gap-2">
            {INSTRUCTIONS.map((scenario) => (
              <button
                key={scenario}
                onClick={() => setSelectedScenario(scenario)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedScenario === scenario
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {scenario}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 min-h-96">
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-4">👋</div>
                <p className="font-medium text-gray-600">开始练习</p>
                <p className="text-sm mt-1">点击麦克风或输入文字，开始和 AI 教练对话</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-80 rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-gray-500">教练正在思考...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="输入你想练习的内容..."
                className="w-full px-4 py-3 bg-gray-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              {/* Mic Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isSpeaking}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                {isListening ? "🔴" : "🎤"}
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading || isSpeaking}
                className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "⏳" : "➡️"}
              </button>
            </div>
          </div>

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              AI 正在说话...
            </div>
          )}
        </div>

        {/* Clear button */}
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            清空对话
          </button>
        )}

        {/* Privacy note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          🔒 你的对话仅在本地处理，不会被永久保存
        </p>
      </div>
    </main>
  );
}
