'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Send, Phone, Mail, User } from 'lucide-react';
import { MESSAGES, FACILITIES } from '@/lib/mock/portal-data';
import type { Message } from '@/types/portals';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PharmMessagesPage() {
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [readThreads, setReadThreads] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group messages by facilityId
  const threads = useMemo(() => {
    const map: Record<number, Message[]> = {};
    for (const m of messages) {
      if (!map[m.facilityId]) map[m.facilityId] = [];
      map[m.facilityId].push(m);
    }
    // Sort each thread by time
    for (const fid of Object.keys(map)) {
      map[Number(fid)].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return map;
  }, [messages]);

  const facilityIds = useMemo(() => {
    return Object.keys(threads)
      .map(Number)
      .sort((a, b) => {
        const lastA = threads[a][threads[a].length - 1];
        const lastB = threads[b][threads[b].length - 1];
        return (
          new Date(lastB.createdAt).getTime() -
          new Date(lastA.createdAt).getTime()
        );
      });
  }, [threads]);

  // Auto-select first thread
  useEffect(() => {
    if (selectedFacilityId === null && facilityIds.length > 0) {
      setSelectedFacilityId(facilityIds[0]);
    }
  }, [facilityIds, selectedFacilityId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedFacilityId]);

  // Mark thread as read when selecting
  useEffect(() => {
    if (selectedFacilityId !== null) {
      setReadThreads(prev => {
        const next = new Set(prev);
        next.add(selectedFacilityId);
        return next;
      });
    }
  }, [selectedFacilityId]);

  const isUnread = (facilityId: number): boolean => {
    if (readThreads.has(facilityId)) return false;
    const thread = threads[facilityId];
    if (!thread || thread.length === 0) return false;
    const last = thread[thread.length - 1];
    return last.senderRole !== 'pharmacist';
  };

  const selectedFacility = FACILITIES.find(f => f.id === selectedFacilityId);
  const currentThread = selectedFacilityId ? threads[selectedFacilityId] ?? [] : [];

  const handleSend = () => {
    if (!inputText.trim() || selectedFacilityId === null) return;

    const newMsg: Message = {
      id: Math.max(...messages.map(m => m.id)) + 1,
      facilityId: selectedFacilityId,
      senderId: 1,
      senderRole: 'pharmacist',
      senderName: 'Dr. Sarah Chen',
      body: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>

      <div className="flex h-[calc(100vh-220px)] rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Left: Thread list */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
          {facilityIds.map(fid => {
            const thread = threads[fid];
            const facility = FACILITIES.find(f => f.id === fid);
            const lastMsg = thread[thread.length - 1];
            const preview =
              lastMsg.body.length > 50
                ? lastMsg.body.slice(0, 50) + '...'
                : lastMsg.body;
            const isActive = selectedFacilityId === fid;
            const unread = isUnread(fid);

            return (
              <button
                key={fid}
                onClick={() => setSelectedFacilityId(fid)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                  isActive
                    ? 'bg-blue-50 border-l-2'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                }`}
                style={isActive ? { borderLeftColor: '#3B6CE7' } : {}}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? 'text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    {facility?.name ?? `Facility ${fid}`}
                  </span>
                  {unread && (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 truncate">{preview}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {formatDate(lastMsg.createdAt)}
                </p>
              </button>
            );
          })}
          {facilityIds.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">
              No conversations yet.
            </div>
          )}
        </div>

        {/* Right: Conversation */}
        <div className="flex flex-1 flex-col">
          {selectedFacility ? (
            <>
              {/* Conversation header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedFacility.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedFacility.contactPerson}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {selectedFacility.contactPhone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedFacility.contactEmail}
                  </span>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {currentThread.map(msg => {
                  const isPharmacist = msg.senderRole === 'pharmacist';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isPharmacist ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isPharmacist
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div
                          className={`mb-1 text-[10px] font-semibold ${
                            isPharmacist ? 'text-blue-200' : 'text-gray-500'
                          }`}
                        >
                          {isPharmacist ? 'You' : msg.senderName}
                        </div>
                        <p className="text-sm leading-relaxed">{msg.body}</p>
                        <div
                          className={`mt-1 text-[10px] ${
                            isPharmacist ? 'text-blue-300' : 'text-gray-400'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-gray-200 px-6 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#3B6CE7' }}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <User className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-400">
                  Select a conversation to start messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
