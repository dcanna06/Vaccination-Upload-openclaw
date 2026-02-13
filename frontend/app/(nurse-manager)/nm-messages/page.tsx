'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { FACILITIES, MESSAGES } from '@/lib/mock/portal-data';
import type { Message } from '@/types/portals';

const ACCENT = '#7c3aed';

interface Thread {
  facilityId: number;
  facilityName: string;
  messages: Message[];
  lastMessage: Message;
  hasUnread: boolean;
}

export default function NMMessagesPage() {
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [activeFacilityId, setActiveFacilityId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Group messages by facilityId into threads
  const threads: Thread[] = useMemo(() => {
    const groupMap = new Map<number, Message[]>();
    for (const m of messages) {
      const existing = groupMap.get(m.facilityId) ?? [];
      existing.push(m);
      groupMap.set(m.facilityId, existing);
    }

    const result: Thread[] = [];
    for (const [facilityId, msgs] of groupMap) {
      const facility = FACILITIES.find(f => f.id === facilityId);
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const lastMsg = sorted[sorted.length - 1];
      result.push({
        facilityId,
        facilityName: facility?.name ?? `Facility ${facilityId}`,
        messages: sorted,
        lastMessage: lastMsg,
        hasUnread: lastMsg.senderRole !== 'nurse_manager',
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );
  }, [messages]);

  // Auto-select first thread
  useEffect(() => {
    if (activeFacilityId === null && threads.length > 0) {
      setActiveFacilityId(threads[0].facilityId);
    }
  }, [activeFacilityId, threads]);

  const activeThread = threads.find(t => t.facilityId === activeFacilityId);

  // Scroll to bottom when active thread changes or new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, activeFacilityId]);

  const handleSend = () => {
    if (!newMessage.trim() || !activeFacilityId) return;

    const msg: Message = {
      id: Math.max(...messages.map(m => m.id), 0) + 1,
      facilityId: activeFacilityId,
      senderId: 100,
      senderRole: 'nurse_manager',
      senderName: 'Lisa Chang',
      body: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const unreadCount = threads.filter(t => t.hasUnread).length;

  return (
    <div className="space-y-0">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500">
          {unreadCount > 0
            ? `${unreadCount} unread conversation${unreadCount !== 1 ? 's' : ''}`
            : 'All caught up'}
        </p>
      </div>

      <div
        className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white"
        style={{ height: 'calc(100vh - 220px)' }}
      >
        {/* Thread List */}
        <div className="w-[260px] flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50">
          {threads.map(thread => {
            const isActive = activeFacilityId === thread.facilityId;

            return (
              <button
                key={thread.facilityId}
                onClick={() => setActiveFacilityId(thread.facilityId)}
                className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                  isActive ? 'bg-white' : 'hover:bg-gray-100'
                }`}
                style={
                  isActive
                    ? { borderLeft: `3px solid ${ACCENT}` }
                    : { borderLeft: '3px solid transparent' }
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? 'text-violet-700' : 'text-gray-900'
                    }`}
                  >
                    {thread.facilityName}
                  </span>
                  {thread.hasUnread && (
                    <span
                      className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                      style={{ background: ACCENT }}
                    >
                      !
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500">
                  {thread.lastMessage.senderName}:{' '}
                  {thread.lastMessage.body.slice(0, 50)}
                  {thread.lastMessage.body.length > 50 ? '...' : ''}
                </p>
                <span className="text-[10px] text-gray-400">
                  {formatDate(thread.lastMessage.createdAt)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Conversation Panel */}
        <div className="flex flex-1 flex-col">
          {/* Thread Header */}
          {activeThread && (
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: ACCENT }}
              >
                {activeThread.facilityName
                  .split(' ')
                  .map(w => w[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {activeThread.facilityName}
                </p>
                <p className="text-xs text-gray-500">
                  {activeThread.messages.length} messages
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!activeThread ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                Select a conversation to view messages
              </div>
            ) : (
              <div className="space-y-3">
                {activeThread.messages.map(msg => {
                  const isNurse = msg.senderRole === 'nurse_manager';
                  const isPharmacist = msg.senderRole === 'pharmacist';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isNurse ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isNurse
                            ? 'text-white'
                            : isPharmacist
                              ? 'bg-blue-50 text-gray-900'
                              : 'bg-gray-100 text-gray-900'
                        }`}
                        style={isNurse ? { background: ACCENT } : {}}
                      >
                        <div
                          className={`mb-1 text-xs font-semibold ${
                            isNurse
                              ? 'text-white/80'
                              : isPharmacist
                                ? 'text-blue-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {isNurse ? 'You' : msg.senderName}
                        </div>
                        <p className="text-sm leading-relaxed">{msg.body}</p>
                        <div
                          className={`mt-1 text-right text-[10px] ${
                            isNurse ? 'text-white/60' : 'text-gray-400'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          {activeThread && (
            <div className="border-t border-gray-200 px-5 py-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-50"
                  style={{ background: ACCENT }}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
