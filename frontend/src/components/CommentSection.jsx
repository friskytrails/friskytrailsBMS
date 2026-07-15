import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, AlertCircle, Paperclip, FileText, X } from 'lucide-react';
import { API_BASE } from '../config';

const CommentSection = ({ booking, token, onCommentAdded }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  
  const commentsEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleOpenFile = (fileUrl, fileName) => {
    if (fileUrl.startsWith('data:application/pdf') || fileUrl.includes('pdf')) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(
          `<iframe src="${fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
        newWindow.document.title = fileName || 'Attachment';
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'attachment.pdf';
        link.click();
      }
    } else {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'attachment';
      link.click();
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview('');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-scroll to the bottom of the comments list
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [booking?.comments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('message', message);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/comment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setMessage('');
        handleRemoveFile();
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
                  className={`p-3 rounded-2xl text-sm leading-relaxed border flex flex-col gap-2 ${
                    isAdmin
                      ? 'bg-[#00A89E] text-white border-[#00A89E]/20 shadow-md shadow-[#00A89E]/5 rounded-tl-none'
                      : 'bg-[#1A1A1A] text-slate-200 border-slate-800 rounded-tr-none'
                  }`}
                >
                  {comment.message && <p className="whitespace-pre-wrap">{comment.message}</p>}
                  
                  {comment.fileUrl && (() => {
                    const fullUrl = comment.fileUrl.startsWith('data:') || comment.fileUrl.startsWith('http')
                      ? comment.fileUrl
                      : `${API_BASE}/${comment.fileUrl}`;
                    return (
                      <div className={`pt-2 ${comment.message ? 'border-t border-slate-755/30' : ''}`}>
                        {comment.fileType && comment.fileType.startsWith('image/') ? (
                          <div className="max-w-[240px] rounded-lg overflow-hidden border border-slate-855 bg-slate-950">
                            <img
                              src={fullUrl}
                              alt={comment.fileName || 'Attachment'}
                              className="w-full h-auto object-contain max-h-[160px] cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage({ url: fullUrl, name: comment.fileName })}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenFile(fullUrl, comment.fileName)}
                            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-350 transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="underline truncate max-w-[200px]" title={comment.fileName}>
                              {comment.fileName || 'Open PDF'}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
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
        {file && (
          <div className="flex items-center gap-3 p-2 bg-slate-950 border border-slate-800 rounded-xl mb-2 animate-scaleUp">
            {filePreview ? (
              <img src={filePreview} alt="upload preview" className="w-10 h-10 object-cover rounded-lg border border-slate-800" />
            ) : (
              <div className="w-10 h-10 bg-slate-900 border border-slate-800 flex items-center justify-center rounded-lg text-indigo-400 font-extrabold text-[10px]">
                PDF
              </div>
            )}
            <div className="flex-grow min-w-0">
              <p className="text-xs font-bold text-slate-300 truncate">{file.name}</p>
              <p className="text-[10px] text-slate-500 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 hover:bg-slate-900 text-slate-500 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, application/pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-[#00A89E] rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="relative flex-grow flex items-center">
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
              disabled={(!message.trim() && !file) || isSubmitting}
              className={`absolute right-1.5 p-2 rounded-lg text-white transition-all cursor-pointer ${
                (message.trim() || file) && !isSubmitting
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
        </div>
      </form>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 font-sans">{selectedImage.name || 'Attachment Preview'}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-slate-950 flex justify-center items-center overflow-auto max-h-[70vh]">
              <img
                src={selectedImage.url}
                alt="Attachment Preview"
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 font-sans flex justify-between items-center">
              <span>Uploaded in chat log</span>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedImage.url;
                  link.download = selectedImage.name || 'download';
                  link.click();
                }}
                className="text-xs font-bold text-indigo-400 hover:text-[#00A89E] underline cursor-pointer"
              >
                Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
