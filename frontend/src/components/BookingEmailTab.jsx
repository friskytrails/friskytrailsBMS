import React,{useMemo,useState} from 'react';
import {AlertCircle,CheckCircle,Mail,Send} from 'lucide-react';
import {API_BASE} from '../config';

const formatDate = value => value ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)) : '';
const formatAmount = value => Number(value || 0).toLocaleString('en-IN')+'/-';
const formatParticipants = (adults=0,children=0) => {
 const parts=[];
 if(adults) parts.push(adults+' Adult'+(adults===1?'':'s'));
 if(children) parts.push(children+' Child'+(children===1?'':'ren'));
 return parts.join(' + ') || '0 Participants';
};

const BookingEmailTab=({booking,token,onBookingUpdated})=>{
 const subjectDefault='Booking Confirmation - '+booking.bookingId+' | Your Adventure Awaits with FriskyTrails!';
 const bodyDefault=useMemo(() => [
  'Hi '+booking.travellerName+',',
  '',
  'Thank you for choosing FriskyTrails for your adventure! We’re thrilled to confirm your booking and look forward to being part of your journey.',
  '',
  'Booking Details:',
  'Booking ID: '+booking.bookingId,
  'Tour/Adventure Package: '+booking.packageName,
  'Guest Name: '+booking.travellerName,
  'Start Date: '+formatDate(booking.startDate),
  'End Date: '+formatDate(booking.endDate),
  'Participants: '+formatParticipants(booking.adults,booking.children),
  'Total Amount: '+formatAmount(booking.totalAmount),
  'Paid Amount: '+formatAmount(booking.paidAmount),
  'Due Amount: '+formatAmount(booking.dueAmount),
  '',
  'Important Information:',
  'Weather Updates: If weather conditions impact the activity/package, we will notify you in advance with alternatives.',
  '',
  'Payment Policy:',
  '- 30% Payment is required once Final Hotel List is shared to you via the team.',
  '- Remaining Payment to be cleared once pickup is done on the Travel Date.',
  '',
  'Rescheduling Policy:',
  '- Changes made 15+ days in advance are subject to availability and may incur a fee.',
  '- Emergency cancellations due to unforeseen circumstances will be reviewed case-by-case.',
  '',
  'Cancellation Policy:',
  '- Cancellations made 30+ days prior to the trip: Full Refund deducting 10% of Total Package Cost.',
  '- Cancellations made 15 to 30 days before the trip: 50% Refund of the Total Package Cost.',
  '- Cancellations made within 14 days: No Refund.',
  '- No refunds for no-shows or unused services.',
  '',
  'Contact Us:',
  'If you have any questions or need further assistance, feel free to reach out to us:',
  'Phone: +91-9341770613',
  'Email: contact@friskytrails.in',
  'Website: https://www.friskytrails.in/',
  'Insta Page: https://www.instagram.com/friskytrails/'
 ].join('\n'),[booking]);
 const [subject,setSubject]=useState(subjectDefault),[body,setBody]=useState(bodyDefault),[sending,setSending]=useState(false),[feedback,setFeedback]=useState({type:'',text:''});
 const sendEmail=async e=>{e.preventDefault();setSending(true);setFeedback({type:'',text:''});try{const response=await fetch(API_BASE+'/api/bookings/'+booking._id+'/email',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({subject,body})});const data=await response.json();if(!response.ok||!data.success)throw new Error(data.message||'Failed to send email');setFeedback({type:'success',text:data.message});onBookingUpdated?.(data.data)}catch(error){setFeedback({type:'error',text:error.message})}finally{setSending(false)}};
 return <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6"><form onSubmit={sendEmail} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl"><h2 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2"><Mail className="w-5 h-5 text-[#00A89E]"/> Booking Email</h2><p className="text-xs text-slate-400 mb-5">Edit the prewritten message before sending it to <span className="text-slate-200 font-semibold">{booking.travellerEmail}</span>.</p>{feedback.text&&<div className={'mb-4 p-3 rounded-lg text-xs flex items-center gap-2 '+(feedback.type==='success'?'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400':'bg-rose-500/10 border border-rose-500/20 text-rose-400')}>{feedback.type==='success'?<CheckCircle className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}{feedback.text}</div>}<label className="block text-xs font-bold text-slate-400 mb-2">Subject</label><input value={subject} onChange={e=>setSubject(e.target.value)} className="w-full mb-4 px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100" required/><label className="block text-xs font-bold text-slate-400 mb-2">Message</label><textarea value={body} onChange={e=>setBody(e.target.value)} rows={15} className="w-full px-3 py-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100 leading-relaxed resize-y" required/><button type="submit" disabled={sending||!booking.travellerEmail} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00A89E] disabled:opacity-50 text-white text-sm font-bold"><Send className="w-4 h-4"/>{sending?'Sending...':'Send Email'}</button></form><div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl"><h3 className="text-sm font-bold text-slate-100 mb-4">Email History</h3>{booking.emailHistory?.length?<div className="space-y-3 max-h-[520px] overflow-y-auto">{[...booking.emailHistory].reverse().map((email,index)=><div key={email._id||index} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800"><p className="text-xs font-bold text-slate-200">{email.subject}</p><p className="text-[11px] text-slate-500 mt-1">{email.to} · {new Date(email.sentAt).toLocaleString()}</p><p className="text-xs text-slate-400 mt-2 whitespace-pre-wrap line-clamp-4">{email.body}</p><p className="text-[10px] text-slate-500 mt-2">Sent by {email.sentByName||'System'}</p></div>)}</div>:<p className="text-xs text-slate-500">No emails sent for this booking yet.</p>}</div></div>;
};
export default BookingEmailTab;
