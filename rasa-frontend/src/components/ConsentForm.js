// src/components/ConsentForm.js
import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';

/**
 * ConsentForm component (enhanced)
 * - Renders the provided consent text clearly with per-line checkboxes and Select All
 * - Uses username as participant name
 * - Generates a PDF approximating the provided layout, including Cardiff logo, initial boxes, and typed e-signatures (names only) with date/time
 * - On success, sets localStorage.consentAccepted = 'true' and sessionStorage.prefillUsername
 */
const hasStoredConsent = () => {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('consentAccepted') === 'true') return true;
  return document.cookie?.split(';').some((c) => c.trim().startsWith('abacws_consent=')) || false;
};

export default function ConsentForm({ onAccepted }) {
  const [username, setUsername] = useState(() => sessionStorage.getItem('prefillUsername') || localStorage.getItem('consentUsername') || '');
  const consentLines = [
    'I confirm that I have read the information sheet dated 24/11/2025 version 1.1 for the above research project.',
    'I confirm that I have understood the information sheet dated 24/11/2025 version 1.1 for the above research project, and that I have had the opportunity to ask questions and that these have been answered satisfactorily.',
    'I understand that my participation is voluntary, and I am free to withdraw at any time without giving a reason and without any adverse consequences (e.g. to medical care or legal rights, or my course/degree progression, if relevant). I understand that if I withdraw, information about me that has already been obtained will be removed and I will be confirmed the deletion.',
    'I understand that data collected during the research project may be looked at by individuals from Cardiff University or from regulatory authorities, where it is strictly necessary and/or relevant to my taking part in the research project. ',
    'I understand that my personal information if found anywhere such as consent forms, will be processed for the purposes explained to me, as set out in the information sheet.  I understand that such information will be held in accordance with all applicable data protection legislation and in strict confidence, unless disclosure is required by law or professional obligation. I have been informed of my rights under data protection legislation and how I can raise any concerns.',
    'I understand who will have access to any personal information provided, how it will be managed, and what will happen to the data at the end of the research project.',
    'I understand that excerpts and/or verbatim quotes from any submitted questions/responses may be used as part of the research publication but that I will not be identified/identifiable.',
    'I understand how the findings and results of the research project will be written up and published.',
    'I agree to take part in this research project.'
  ];
  const [checks, setChecks] = useState(() => consentLines.map(() => hasStoredConsent()));
  const [selectAll, setSelectAll] = useState(hasStoredConsent());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const allChecked = useMemo(() => checks.every(Boolean), [checks]);

  useEffect(() => { setSelectAll(allChecked); }, [allChecked]);

  const toggleAll = (value) => {
    setSelectAll(value);
    setChecks(checks.map(() => value));
  };

  const handleCheck = (idx, value) => {
    setChecks((arr) => arr.map((v, i) => (i === idx ? value : v)));
  };

  // Helper to load an image as a data URL for jsPDF
  const loadImageAsDataURL = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });

  const generatePdf = async () => {
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15); // YYYYMMDDHHmmss
    const filename = `consent_${username || 'participant'}_${stamp}.pdf`;

    // Helper: dd/mm/yyyy hh:mm
    const formatDateTime = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    };

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // Layout metrics
  const pageWidth = 210;
  const marginL = 12;
  const marginR = 12;
  const boxSize = 5; // smaller checkbox
  const boxX = pageWidth - marginR - boxSize; // right-aligned box position
  const textWidth = boxX - marginL - 6; // leave small gap before box
  const sepX = boxX - 4; // vertical separator between text and initials box
  const lineH = 5; // base line height for 10pt font
  const logoTop = 12;
  let y = logoTop;

    // Logo (if available)
    let logoBottom = logoTop;
    try {
      const logoUrl = `${process.env.PUBLIC_URL}/cardiff-university-logo.jpg`;
      const logo = await loadImageAsDataURL(logoUrl);
      doc.addImage(logo, 'JPEG', marginL, logoTop, 28, 28);
      logoBottom = logoTop + 28;
    } catch (_) { /* ignore logo load errors */ }

  // Header titles (smaller fonts to avoid overlap)
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('CONSENT FORM', 105, y + 6, { align: 'center' });
  doc.setFont(undefined, 'normal');
  // Ensure all following text starts below the logo with extra spacing
  y = Math.max(y + 14, logoBottom + 6);

    // Header block: use a two-column layout so labels and values do not overlap
    const headerLabelWidth = 60; // mm reserved for the left label column
    const headerValueX = marginL + headerLabelWidth;
    const headerValueWidth = Math.max(80, textWidth - headerLabelWidth);
    const writeLine = (label, value) => {
      doc.setFontSize(10);
      // split label into its own small column (bold)
      doc.setFont(undefined, 'bold');
      const labelLines = doc.splitTextToSize(label, headerLabelWidth);
      doc.text(labelLines, marginL, y);
      // value column (normal)
      doc.setFont(undefined, 'normal');
      const wrapped = doc.splitTextToSize(value, headerValueWidth);
      doc.text(wrapped, headerValueX, y);
      // advance by the larger of the two column heights + extra spacing
      const usedLines = Math.max(labelLines.length, wrapped.length);
      y += usedLines * lineH + 4;
    };

    writeLine('Title of research project:', 'A Survey-Based Study to Develop a Corpus of Natural Language Queries for Smart Building Interaction');
    writeLine('SREC reference and committee:', 'COMSC/Ethics/2025/044');
    writeLine('Name of [Chief/Principal Investigator] [lead researcher]:', 'Suhas Devmane');
    

  // Initials label at right
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Please initial box', boxX + boxSize / 2, y - 2, { align: 'center' });
  doc.setFont(undefined, 'normal');

    // Consent lines with initial boxes on the right
    y += 2;
    const consentTop = y; // track top of consent block for drawing borders
  const leftX = marginL;
    doc.setFontSize(10);
    consentLines.forEach((line, idx) => {
      const wrapped = doc.splitTextToSize(line, textWidth);
      // text
      doc.text(wrapped, leftX, y);
      // checkbox near right margin
      const boxY = y - (boxSize - 2);
      doc.rect(boxX, boxY, boxSize, boxSize);
      if (checks[idx]) {
        const prevWidth = doc.getLineWidth();
        doc.setLineWidth(0.5);
        // draw a neat tick inside the small box
        doc.line(boxX + 1.0, boxY + boxSize - 1.2, boxX + 2.2, boxY + boxSize - 0.6);
        doc.line(boxX + 2.2, boxY + boxSize - 0.6, boxX + boxSize - 0.7, boxY + 1.0);
        doc.setLineWidth(prevWidth);
      }
      // advance by wrapped height
      y += Math.max(lineH + 2, wrapped.length * lineH + 2);
      // page break if needed
      if (y > 260 && idx < consentLines.length - 1) {
        doc.addPage();
        y = 20;
      }
    });

    // Draw a light vertical separator to emulate table layout (if no page wrap occurred)
    try {
      const prevWidth = doc.getLineWidth();
      doc.setLineWidth(0.1);
      // limit separator within consent block height
      const sepTop = Math.max(consentTop - 1, 20);
      const sepBottom = Math.min(y + 1, 270);
      doc.line(sepX, sepTop, sepX, sepBottom);
      doc.setLineWidth(prevWidth);
    } catch (_) { /* ignore drawing errors */ }

    // Signatures section
  y += 4;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Name of participant', marginL, y); doc.setFont(undefined, 'normal');
  doc.text(username || '(not provided)', marginL + 58, y);
  // underline for name field
  try {
    const prevWidth = doc.getLineWidth();
    doc.setLineWidth(0.2);
    doc.line(marginL + 58, y + 1.2, marginL + 108, y + 1.2);
    doc.setLineWidth(prevWidth);
  } catch (_) {}
  doc.setFont(undefined, 'bold'); doc.text('Date', marginL + 94, y); doc.setFont(undefined, 'normal');
  doc.text(formatDateTime(now), marginL + 144, y, { align: 'right' });
  // underline for date field
  try { const pw = doc.getLineWidth(); doc.setLineWidth(0.2); doc.line(marginL + 124, y + 1.2, marginL + 148, y + 1.2); doc.setLineWidth(pw); } catch (_) {}
  // Move signature to a new line to avoid crowding
  y += 6;
  doc.setFont(undefined, 'bold'); doc.text('eSignature(print)', marginL, y); 
  // signature-style: larger, italic, right-aligned
  doc.setFontSize(12);
  doc.setFont(undefined, 'italic');
  doc.text(username || '(not provided)', pageWidth - marginR, y, { align: 'right' });
  // restore normal font size for subsequent text
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  // signature line on the far right
  try { const pw = doc.getLineWidth(); doc.setLineWidth(0.2); doc.line(pageWidth - marginR - 48, y + 1.2, pageWidth - marginR, y + 1.2); doc.setLineWidth(pw); } catch (_) {}
  y += 8;

  doc.setFont(undefined, 'bold');
  doc.text('Name of person taking consent', marginL, y); doc.setFont(undefined, 'normal');
  doc.text('Suhas Devmane', marginL + 58, y);
  // underline for researcher name
  try { const pw = doc.getLineWidth(); doc.setLineWidth(0.2); doc.line(marginL + 78, y + 1.2, marginL + 128, y + 1.2); doc.setLineWidth(pw); } catch (_) {}
  doc.setFont(undefined, 'bold'); doc.text('Date', marginL + 94, y); doc.setFont(undefined, 'normal');
  doc.text(formatDateTime(now), marginL + 144, y, { align: 'right' });
  try { const pw = doc.getLineWidth(); doc.setLineWidth(0.2); doc.line(marginL + 124, y + 1.2, marginL + 148, y + 1.2); doc.setLineWidth(pw); } catch (_) {}
  // Move signature to new line
  y += 6;
  doc.setFont(undefined, 'bold'); doc.text('eSignature(print)', marginL, y); 
  // signature-style: larger, italic, right-aligned
  doc.setFontSize(12);
  doc.setFont(undefined, 'italic');
  doc.text('Suhas Devmane', pageWidth - marginR, y, { align: 'right' });
  // restore
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  try { const pw = doc.getLineWidth(); doc.setLineWidth(0.2); doc.line(pageWidth - marginR - 48, y + 1.2, pageWidth - marginR, y + 1.2); doc.setLineWidth(pw); } catch (_) {}
  y += 8;

  doc.setFont(undefined, 'bold');
  doc.text('Role of person taking consent', marginL, y); doc.setFont(undefined, 'normal');
  doc.text('Lead researcher', marginL + 86, y);

    // Footer
    doc.setFontSize(10);
    doc.text('THANK YOU FOR PARTICIPATING IN OUR RESEARCH', 105, 285, { align: 'center' });
    doc.text('YOU WILL BE GIVEN A COPY OF THIS CONSENT FORM TO KEEP', 105, 291, { align: 'center' });

    // Save local copy for user
    doc.save(filename);
    
    // Return PDF blob and timestamp for server upload
    return {
      blob: doc.output('blob'),
      timestamp: stamp
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setMessage('');
    if (!username.trim()) { setMessage('Please enter your name/username'); return; }
    if (!allChecked) { setMessage('Please accept all consent items to continue'); return; }
    try {
      setSubmitting(true);
      
      // Generate PDF and get blob for server upload
      const { blob, timestamp } = await generatePdf();
      
      // Upload PDF to server
      try {
        const API_BASE = process.env.REACT_APP_API_URL || '/api';
        
        const uploadRes = await fetch(
          `${API_BASE}/survey/save-consent?username=${encodeURIComponent(username.trim())}&timestamp=${timestamp}`,
          {
            method: 'POST',
            body: blob,
            headers: {
              'Content-Type': 'application/pdf'
            }
          }
        );
        
        if (!uploadRes.ok) {
          console.warn('Failed to upload consent PDF to server:', await uploadRes.text());
        } else {
          console.log('Consent PDF uploaded to server successfully');
        }
      } catch (uploadError) {
        console.warn('Error uploading consent PDF:', uploadError);
        // Continue even if upload fails - user still has local copy
      }
      
      localStorage.setItem('consentAccepted', 'true');
      localStorage.setItem('consentUsername', username.trim());
      sessionStorage.setItem('prefillUsername', username.trim());
      try {
        const oneYear = 60 * 60 * 24 * 365;
        document.cookie = `abacws_consent=1; path=/; max-age=${oneYear}; SameSite=Lax`;
      } catch (cookieError) {
        console.warn('Failed to persist consent cookie:', cookieError);
      }
      setMessage('Consent recorded and PDF downloaded. You can now login.');
      if (typeof onAccepted === 'function') onAccepted(username.trim());
      try {
        window.dispatchEvent(new Event('abacws-consent-accepted'));
      } catch (evtError) {
        console.warn('Consent event dispatch failed:', evtError);
      }
    } catch (e) {
      console.error('PDF generation failed:', e);
      setMessage('Failed to generate consent PDF. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📝</div>
        <h3 style={{ color: '#333', fontWeight: '600', marginBottom: '8px' }}>Consent Form</h3>
      </div>
      
      <div className="p-3 mb-3" style={{ 
        background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        lineHeight: '1.6'
      }}>
        <div className="mb-2">
          <strong style={{ color: '#667eea' }}>Study Title:</strong>
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
            <em>A Survey-Based Study to Develop a Corpus of Natural Language Queries for Smart Building Interaction</em>
          </div>
        </div>
        <div className="mb-2">
          <strong style={{ color: '#667eea' }}>SREC Reference:</strong>
          <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>COMSC/Ethics/2025/044</span>
        </div>
        <div>
          <strong style={{ color: '#667eea' }}>Lead Researcher:</strong>
          <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>Suhas Devmane</span>
        </div>
        <div>
          <strong style={{ color: '#667eea' }}>Need assistance during the guided survey?</strong>
          <span className="text-muted d-block" style={{ fontSize: '0.85rem' }}>
            Email <a href="mailto:Devmanesp1@cardiff.ac.uk" style={{ color: '#3e82ff' }}>Devmanesp1@cardiff.ac.uk</a> for help or clarifications.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label" style={{ fontWeight: '600', color: '#333' }}>
            Participant Name <span className="text-muted" style={{ fontWeight: '400', fontSize: '0.9rem' }}>(will be printed on the PDF)</span>
          </label>
          <input 
            type="text" 
            className="form-control" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Enter your name" 
            disabled={submitting} 
            required 
            style={{ 
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.95rem'
            }}
          />
        </div>

        <div className="mb-3 p-3" style={{ 
          background: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <label style={{ fontWeight: '600', color: '#333', marginBottom: 0 }}>
              Consent Statements
            </label>
            <div className="form-check" style={{ marginBottom: 0 }}>
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="selectAll" 
                checked={selectAll} 
                onChange={(e) => toggleAll(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor="selectAll" style={{ cursor: 'pointer', fontWeight: '600', color: '#667eea' }}>
                Select All
              </label>
            </div>
          </div>

          <div className="mt-3" style={{ 
            maxHeight: '340px', 
            overflowY: 'auto', 
            paddingRight: '8px',
            fontSize: '0.9rem'
          }}>
            {consentLines.map((line, idx) => (
              <div 
                key={idx} 
                className="form-check mb-3 p-2" 
                style={{ 
                  background: checks[idx] ? 'rgba(102,126,234,0.05)' : '#fff',
                  borderRadius: '6px',
                  border: checks[idx] ? '1px solid rgba(102,126,234,0.2)' : '1px solid #e9ecef',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id={`c-${idx}`} 
                  checked={!!checks[idx]} 
                  onChange={(e) => handleCheck(idx, e.target.checked)}
                  style={{ 
                    cursor: 'pointer',
                    marginTop: '0.2em'
                  }}
                />
                <label 
                  className="form-check-label" 
                  htmlFor={`c-${idx}`}
                  style={{ 
                    cursor: 'pointer',
                    lineHeight: '1.6',
                    color: '#333'
                  }}
                >
                  {line}
                </label>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div 
            className="alert mb-3" 
            role="alert"
            style={{
              background: message.includes('Failed') ? '#fee' : 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
              border: message.includes('Failed') ? '1px solid #fcc' : '1px solid rgba(102,126,234,0.2)',
              borderRadius: '8px',
              color: message.includes('Failed') ? '#c33' : '#333',
              fontSize: '0.9rem'
            }}
          >
            {message.includes('recorded') && '✅ '}
            {message.includes('Failed') && '⚠️ '}
            {message}
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary w-100" 
          disabled={submitting || !allChecked || !username.trim()}
          style={{
            padding: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            if (!submitting && allChecked && username.trim()) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(102,126,234,0.4)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
          }}
        >
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Generating PDF...
            </>
          ) : (
            <>📄 Accept & Download PDF</>
          )}
        </button>
        
        <div className="text-center mt-3" style={{ fontSize: '0.85rem', color: '#666' }}>
          <small>
            By clicking accept, you confirm that you have read and understood all consent statements above.
          </small>
        </div>
      </form>
    </div>
  );
}
