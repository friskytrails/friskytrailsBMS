import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config';

const CommentSection = ({ booking, token, onCommentAdded }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const commentsEndRef = useRef(null);

  // Auto-scroll to the bottom of the comments list
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [booking?.comments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setMessage('');
        if (onCommentAdded) {
          onCommentAdded(data.data);
        }
      } else {
        setError(data.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Connection failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col h-full min-h-[400px]">
      <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
        <MessageSquare className="w-5 h-5 text-[#00A89E]" />
        <span>Discussion & Log</span>
      </h2>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-lg flex items-center space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-grow overflow-y-auto pr-1 mb-4 space-y-4 max-h-[350px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {booking?.comments && booking.comments.length > 0 ? (
          booking.comments.map((comment) => {
            const isSystem = comment.senderName && comment.senderName.startsWith('System');
            const isAdmin = !isSystem && comment.sender?.role === 'admin';
            
            if (isSystem) {
              return (
                <div
                  key={comment._id}
                  className="flex flex-col items-center justify-center my-3 px-2"
                >
                  <div className="bg-slate-950/40 border border-indigo-500/20 border-dashed rounded-xl px-4 py-2.5 w-full text-center shadow-inner">
                    <p className="text-[11px] font-bold text-indigo-400 tracking-wide uppercase mb-0.5">
                      {comment.senderName}
                    </p>
                    <p className="text-xs text-slate-300 italic font-medium whitespace-pre-wrap">
                      {comment.message}
                    </p>
                    <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                      {new Date(comment.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              );
            }
            
            return (
              <div
                key={comment._id}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-baseline justify-between px-1">
                  <span className="text-xs font-bold text-slate-300">
                    {comment.senderName}
                    <span className="ml-1.5 text-[9px] uppercase font-extrabold tracking-wider opacity-60">
                      {isAdmin ? 'Admin' : 'Agent'}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* Bubble color: Frisky Teal #00A89E for Admin, Charcoal #1A1A1A for Agent */}
                <div
                  className={`p-3 rounded-2xl text-sm leading-relaxed border ${
                    isAdmin
                      ? 'bg-[#00A89E] text-white border-[#00A89E]/20 shadow-md shadow-[#00A89E]/5 rounded-tl-none'
                      : 'bg-[#1A1A1A] text-slate-200 border-slate-800 rounded-tr-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{comment.message}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
            <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs">No comments or activity logs yet.</p>
          </div>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSubmitting}
            className="w-full pl-4 pr-12 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl text-sm text-slate-200 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className={`absolute right-1.5 p-2 rounded-lg text-white transition-all cursor-pointer ${
              message.trim() && !isSubmitting
                ? 'bg-[#00A89E] hover:bg-[#008f86] shadow-sm'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
