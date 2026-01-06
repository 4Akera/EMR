"use client";

import { Copy, Check, FileCode } from "lucide-react";
import { Button } from "@/components/ui";
import { useState } from "react";
import type { Encounter, Patient, EncounterAction, EncounterFile, EncounterMedication, PatientDetails } from "@/lib/types/database";
import { formatDateTime, getActionTypeLabel } from "@/lib/utils";

interface EncounterExportProps {
  encounter: Encounter;
  patient: Patient;
  patientDetails?: PatientDetails | null;
  actions?: EncounterAction[];
  files?: EncounterFile[];
  medications?: EncounterMedication[];
}

export function EncounterExport({ 
  encounter, 
  patient, 
  patientDetails,
  actions = [],
  files = [],
  medications = []
}: EncounterExportProps) {
  const [copied, setCopied] = useState(false);

  const calculateAge = (dob: string | null) => {
    if (!dob) return '?';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Convert image URL to base64 for offline viewing on iPhone
  const imageToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      return url; // Fallback to original URL
    }
  };

  const generateEncounterHTML = (): string => {
    let html = '';
    
    // Patient Information Section
    html += `
      <div class="section">
        <h2 class="section-title">PATIENT INFORMATION</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Name:</span>
            <span class="value">${patient.fullName}</span>
          </div>
          <div class="info-item">
            <span class="label">Age/Sex:</span>
            <span class="value">${calculateAge(patient.birthDate)} years / ${patient.sex || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="label">Date of Birth:</span>
            <span class="value">${patient.birthDate ? formatDateTime(patient.birthDate) : 'Not recorded'}</span>
          </div>
          <div class="info-item">
            <span class="label">MRN:</span>
            <span class="value">${patient.mrn || 'Not assigned'}</span>
          </div>
          ${patient.phone ? `
            <div class="info-item">
              <span class="label">Phone:</span>
              <span class="value">${patient.phone}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Patient Medical History
    if (patientDetails && (patientDetails.pmh || patientDetails.psh || patientDetails.allergies || 
        patientDetails.currentMeds || patientDetails.familyHx || patientDetails.socialHx)) {
      html += `
        <div class="section">
          <h2 class="section-title">PATIENT MEDICAL HISTORY</h2>
          ${patientDetails.pmh ? `
            <div class="subsection">
              <h3 class="subsection-title">Past Medical History</h3>
              <p class="text-content">${patientDetails.pmh}</p>
            </div>
          ` : ''}
          ${patientDetails.psh ? `
            <div class="subsection">
              <h3 class="subsection-title">Past Surgical History</h3>
              <p class="text-content">${patientDetails.psh}</p>
            </div>
          ` : ''}
          ${patientDetails.allergies ? `
            <div class="subsection">
              <h3 class="subsection-title">Allergies</h3>
              <p class="text-content alert-box">${patientDetails.allergies}</p>
            </div>
          ` : ''}
          ${patientDetails.currentMeds ? `
            <div class="subsection">
              <h3 class="subsection-title">Current Medications</h3>
              <p class="text-content">${patientDetails.currentMeds}</p>
            </div>
          ` : ''}
          ${patientDetails.familyHx ? `
            <div class="subsection">
              <h3 class="subsection-title">Family History</h3>
              <p class="text-content">${patientDetails.familyHx}</p>
            </div>
          ` : ''}
          ${patientDetails.socialHx ? `
            <div class="subsection">
              <h3 class="subsection-title">Social History</h3>
              <p class="text-content">${patientDetails.socialHx}</p>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    // Encounter Details
    html += `
      <div class="section">
        <h2 class="section-title">ENCOUNTER DETAILS</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Status:</span>
            <span class="value status-${encounter.status.toLowerCase()}">${encounter.status}</span>
          </div>
          <div class="info-item">
            <span class="label">Admission:</span>
            <span class="value">${formatDateTime(encounter.startAt)}</span>
          </div>
          ${encounter.endAt ? `
            <div class="info-item">
              <span class="label">${encounter.status === 'DISCHARGED' ? 'Discharge' : 'End'} Date:</span>
              <span class="value">${formatDateTime(encounter.endAt)}</span>
            </div>
          ` : ''}
          ${encounter.currentLocation ? `
            <div class="info-item">
              <span class="label">Location:</span>
              <span class="value">${encounter.currentLocation}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Clinical Documentation
    if (encounter.cc || encounter.hpi || encounter.ros || encounter.physicalExam || 
        encounter.investigations || encounter.summary) {
      html += `
        <div class="section">
          <h2 class="section-title">CLINICAL DOCUMENTATION</h2>
          ${encounter.cc ? `
            <div class="subsection">
              <h3 class="subsection-title">Chief Complaint</h3>
              <p class="text-content">${encounter.cc}</p>
            </div>
          ` : ''}
          ${encounter.hpi ? `
            <div class="subsection">
              <h3 class="subsection-title">History of Present Illness</h3>
              <p class="text-content">${encounter.hpi}</p>
            </div>
          ` : ''}
          ${encounter.ros ? `
            <div class="subsection">
              <h3 class="subsection-title">Review of Systems</h3>
              <p class="text-content">${encounter.ros}</p>
            </div>
          ` : ''}
          ${encounter.physicalExam ? `
            <div class="subsection">
              <h3 class="subsection-title">Physical Examination</h3>
              <p class="text-content">${encounter.physicalExam}</p>
            </div>
          ` : ''}
          ${encounter.investigations ? `
            <div class="subsection">
              <h3 class="subsection-title">Investigations</h3>
              <p class="text-content">${encounter.investigations}</p>
            </div>
          ` : ''}
          ${encounter.summary ? `
            <div class="subsection">
              <h3 class="subsection-title">Summary / Plan</h3>
              <p class="text-content">${encounter.summary}</p>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    // Diagnosis
    if (encounter.primaryDx || encounter.problemListText) {
      html += `
        <div class="section">
          <h2 class="section-title">DIAGNOSIS & PROBLEMS</h2>
          ${encounter.primaryDx ? `
            <div class="subsection">
              <h3 class="subsection-title">Primary / Final Diagnosis</h3>
              <p class="text-content diagnosis-highlight">${encounter.primaryDx}</p>
            </div>
          ` : ''}
          ${encounter.problemListText ? `
            <div class="subsection">
              <h3 class="subsection-title">Problem List</h3>
              <p class="text-content">${encounter.problemListText}</p>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    // Medications Prescribed
    if (medications && medications.length > 0) {
      const activeMeds = medications.filter(m => m.status === 'ACTIVE' && !m.deletedAt);
      const stoppedMeds = medications.filter(m => m.status === 'STOPPED' && !m.deletedAt);
      
      html += `
        <div class="section">
          <h2 class="section-title">MEDICATIONS PRESCRIBED</h2>
      `;
      
      if (activeMeds.length > 0) {
        html += `
          <div class="subsection">
            <h3 class="subsection-title">Active Medications (${activeMeds.length})</h3>
            <div class="medications-list">
              ${activeMeds.map((med, index) => `
                <div class="medication-item">
                  <div class="medication-header">
                    <span class="medication-number">${index + 1}.</span>
                    <span class="medication-name">${med.name}</span>
                  </div>
                  <div class="medication-details">
                    ${med.dose ? `<span><strong>Dose:</strong> ${med.dose}</span>` : ''}
                    ${med.route ? `<span><strong>Route:</strong> ${med.route}</span>` : ''}
                    ${med.frequency ? `<span><strong>Frequency:</strong> ${med.frequency}</span>` : ''}
                  </div>
                  ${med.indication ? `<div class="medication-indication"><strong>Indication:</strong> ${med.indication}</div>` : ''}
                  ${med.notes ? `<div class="medication-notes"><strong>Notes:</strong> ${med.notes}</div>` : ''}
                  <div class="medication-date">Started: ${formatDateTime(med.startAt)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      if (stoppedMeds.length > 0) {
        html += `
          <div class="subsection">
            <h3 class="subsection-title">Stopped Medications (${stoppedMeds.length})</h3>
            <div class="medications-list stopped">
              ${stoppedMeds.map((med, index) => `
                <div class="medication-item stopped">
                  <div class="medication-header">
                    <span class="medication-number">${index + 1}.</span>
                    <span class="medication-name">${med.name}</span>
                  </div>
                  <div class="medication-date">
                    ${formatDateTime(med.startAt)} → ${med.stopAt ? formatDateTime(med.stopAt) : 'Unknown'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      html += `
        </div>
      `;
    }
    
    // Timeline
    if (actions && actions.length > 0) {
      const sortedActions = [...actions].sort((a, b) => 
        new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime()
      );
      
      html += `
        <div class="section">
          <h2 class="section-title">ENCOUNTER TIMELINE</h2>
          <div class="timeline">
            ${sortedActions.map((action, index) => `
              <div class="timeline-item">
                <div class="timeline-marker">${index + 1}</div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-type">${getActionTypeLabel(action.type)}</span>
                    <span class="timeline-time">${formatDateTime(action.eventAt)}</span>
                  </div>
                  <p class="timeline-text">${action.text}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Attachments/Files
    if (files && files.length > 0) {
      html += `
        <div class="section">
          <h2 class="section-title">ATTACHMENTS</h2>
          <div class="attachments-list">
            ${files.map((file, index) => `
              <div class="attachment-item">
                <span class="attachment-number">${index + 1}.</span>
                <div class="attachment-details">
                  <div class="attachment-name">${file.fileName}</div>
                  <div class="attachment-meta">
                    <span class="file-type">${file.fileType}</span>
                    ${file.caption ? `<span class="file-caption">• ${file.caption}</span>` : ''}
                    <span class="file-date">• ${formatDateTime(file.createdAt)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Discharge Note
    if (encounter.status === 'DISCHARGED' && encounter.dischargeNote) {
      html += `
        <div class="section discharge-section">
          <h2 class="section-title">DISCHARGE SUMMARY</h2>
          ${encounter.dischargeAt ? `
            <div class="discharge-date"><strong>Discharge Date:</strong> ${formatDateTime(encounter.dischargeAt)}</div>
          ` : ''}
          <div class="discharge-note">${encounter.dischargeNote}</div>
        </div>
      `;
    }
    
    return html;
  };

  const handleCopyText = async () => {
    // Generate plain text version for clipboard
    const textLines: string[] = [];
    textLines.push("ENCOUNTER SUMMARY");
    textLines.push("═".repeat(60));
    textLines.push("");
    textLines.push("PATIENT: " + patient.fullName);
    textLines.push("DATE: " + formatDateTime(encounter.startAt));
    textLines.push("STATUS: " + encounter.status);
    textLines.push("");
    
    // Add basic encounter info as plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateEncounterHTML();
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const generateFullHTML = async () => {
    const contentHTML = generateEncounterHTML();
    
    // Generate images HTML with base64 encoding for offline viewing
    let imagesHTML = '';
    const imageFiles = files?.filter(f => f.fileType.startsWith('image/')) || [];
    
    if (imageFiles.length > 0) {
      // Convert all images to base64
      const imagePromises = imageFiles.map(async (file) => {
        const base64Image = await imageToBase64(file.fileUrl);
        return { ...file, base64Image };
      });
      
      const imagesWithBase64 = await Promise.all(imagePromises);
      
      imagesHTML = `
        <div class="images-section">
          <h2>ATTACHED IMAGES</h2>
          <div class="separator">───────────────────────────────────────────────────────</div>
          ${imagesWithBase64.map((file, index) => `
            <div class="image-container">
              <p class="image-title">${index + 1}. ${file.fileName}</p>
              ${file.caption ? `<p class="image-desc">Caption: ${file.caption}</p>` : ''}
              <img src="${file.base64Image}" alt="${file.fileName}" class="encounter-image" />
              <p class="image-date">Uploaded: ${formatDateTime(file.createdAt)}</p>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    // Create HTML content with beautiful styling
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Encounter Summary - ${patient.fullName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 2cm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 11pt;
              line-height: 1.6;
              color: #1f2937;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              min-height: 100vh;
              padding: 20px;
            }
            
            .container {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
              border-radius: 12px;
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
              color: white;
              padding: 30px 40px;
              position: relative;
            }
            
            .header h1 {
              font-size: 28pt;
              font-weight: 700;
              margin-bottom: 8px;
            }
            
            .header .subtitle {
              font-size: 12pt;
              opacity: 0.95;
            }
            
            .content {
              padding: 40px;
            }
            
            .section {
              margin-bottom: 30px;
              padding: 25px;
              background: #f9fafb;
              border-left: 4px solid #0ea5e9;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 18pt;
              font-weight: 700;
              color: #0284c7;
              margin-bottom: 20px;
              padding-bottom: 12px;
              border-bottom: 2px solid #0ea5e9;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .subsection {
              margin-bottom: 20px;
            }
            
            .subsection-title {
              font-size: 13pt;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 10px;
              padding-left: 10px;
              border-left: 3px solid #93c5fd;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 15px;
            }
            
            .info-item {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            
            .label {
              font-weight: 600;
              color: #6b7280;
              font-size: 10pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .value {
              font-weight: 500;
              color: #1f2937;
              font-size: 11pt;
            }
            
            .status-active {
              color: #059669;
              font-weight: 700;
            }
            
            .status-discharged {
              color: #0284c7;
              font-weight: 700;
            }
            
            .status-deceased {
              color: #6b7280;
              font-weight: 700;
            }
            
            .text-content {
              white-space: pre-wrap;
              word-wrap: break-word;
              line-height: 1.8;
              color: #374151;
              padding: 12px;
              background: white;
              border-radius: 6px;
            }
            
            .alert-box {
              background: #fef2f2;
              border: 1px solid #fecaca;
              color: #991b1b;
              font-weight: 500;
            }
            
            .diagnosis-highlight {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              font-weight: 600;
              color: #1e40af;
            }
            
            .medications-list {
              display: flex;
              flex-direction: column;
              gap: 12px;
              padding: 12px;
              background: white;
              border-radius: 6px;
            }
            
            .medication-item {
              padding: 15px;
              background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%);
              border-left: 4px solid #0ea5e9;
              border-radius: 6px;
              page-break-inside: avoid;
            }
            
            .medication-item.stopped {
              background: #f9fafb;
              border-left-color: #9ca3af;
              opacity: 0.8;
            }
            
            .medication-header {
              display: flex;
              gap: 8px;
              align-items: baseline;
              margin-bottom: 8px;
            }
            
            .medication-number {
              font-weight: 700;
              color: #0ea5e9;
              font-size: 11pt;
            }
            
            .medication-name {
              font-weight: 700;
              color: #1f2937;
              font-size: 12pt;
            }
            
            .medication-item.stopped .medication-name {
              text-decoration: line-through;
              color: #6b7280;
            }
            
            .medication-details {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin-bottom: 8px;
              font-size: 10pt;
              color: #374151;
            }
            
            .medication-indication {
              padding: 8px 12px;
              background: #dbeafe;
              border-radius: 4px;
              font-size: 10pt;
              color: #1e40af;
              margin-bottom: 6px;
            }
            
            .medication-notes {
              padding: 8px 12px;
              background: #fef3c7;
              border-radius: 4px;
              font-size: 10pt;
              color: #92400e;
              font-style: italic;
              margin-bottom: 6px;
            }
            
            .medication-date {
              font-size: 9pt;
              color: #6b7280;
              margin-top: 6px;
            }
            
            .timeline {
              display: flex;
              flex-direction: column;
              gap: 15px;
            }
            
            .timeline-item {
              display: flex;
              gap: 15px;
            }
            
            .timeline-marker {
              flex-shrink: 0;
              width: 32px;
              height: 32px;
              background: #0ea5e9;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 10pt;
            }
            
            .timeline-content {
              flex: 1;
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .timeline-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            
            .timeline-type {
              font-weight: 700;
              color: #0284c7;
              font-size: 11pt;
            }
            
            .timeline-time {
              font-size: 9pt;
              color: #6b7280;
            }
            
            .timeline-text {
              color: #374151;
              line-height: 1.6;
            }
            
            .attachments-list {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            
            .attachment-item {
              display: flex;
              gap: 12px;
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .attachment-number {
              font-weight: 700;
              color: #0ea5e9;
            }
            
            .attachment-details {
              flex: 1;
            }
            
            .attachment-name {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 4px;
            }
            
            .attachment-meta {
              font-size: 9pt;
              color: #6b7280;
            }
            
            .file-type {
              background: #f3f4f6;
              padding: 2px 8px;
              border-radius: 4px;
              font-family: monospace;
            }
            
            .discharge-section {
              background: #eff6ff;
              border-left-color: #2563eb;
            }
            
            .discharge-date {
              margin-bottom: 15px;
              color: #1f2937;
              font-size: 11pt;
            }
            
            .discharge-note {
              white-space: pre-wrap;
              line-height: 1.8;
              color: #1f2937;
              background: white;
              padding: 20px;
              border-radius: 8px;
              border: 2px solid #bfdbfe;
              font-weight: 500;
            }
            
            .images-section {
              page-break-before: always;
              padding: 40px;
            }
            
            .images-section h2 {
              font-size: 20pt;
              font-weight: 700;
              color: #0284c7;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 3px solid #0ea5e9;
            }
            
            .image-container {
              margin-bottom: 40px;
              page-break-inside: avoid;
              background: white;
              padding: 20px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }
            
            .image-title {
              font-weight: 600;
              font-size: 12pt;
              color: #1f2937;
              margin-bottom: 8px;
            }
            
            .image-desc {
              font-style: italic;
              margin-bottom: 15px;
              color: #6b7280;
              font-size: 10pt;
            }
            
            .encounter-image {
              width: 100%;
              max-height: 600px;
              object-fit: contain;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              background: #f9fafb;
            }
            
            .image-date {
              font-size: 9pt;
              color: #9ca3af;
              margin-top: 10px;
            }
            
            .print-btn {
              position: fixed;
              top: 30px;
              right: 30px;
              padding: 12px 24px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
              transition: all 0.2s ease;
              z-index: 1000;
            }
            
            .print-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
            }
            
            .print-btn:active {
              transform: translateY(0);
            }
            
            .footer {
              padding: 20px 40px;
              background: #f9fafb;
              text-align: center;
              color: #6b7280;
              font-size: 9pt;
              border-top: 1px solid #e5e7eb;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .container {
                box-shadow: none;
                border-radius: 0;
              }
              
              .print-btn {
                display: none;
              }
              
              .image-container {
                page-break-inside: avoid;
              }
              
              .section {
                page-break-inside: avoid;
              }
            }
            
            @media screen and (max-width: 768px) {
              body {
                padding: 10px;
              }
              
              .header {
                padding: 20px;
              }
              
              .header h1 {
                font-size: 20pt;
              }
              
              .content {
                padding: 20px;
              }
              
              .print-btn {
                top: 15px;
                right: 15px;
                padding: 10px 18px;
                font-size: 12px;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ Print to PDF</button>
          
          <div class="container">
            <div class="header">
              <h1>Encounter Summary</h1>
              <div class="subtitle">${patient.fullName} • ${formatDateTime(encounter.startAt)}</div>
            </div>
            
            <div class="content">
              ${contentHTML}
            </div>
            
            <div class="footer">
              Generated on ${formatDateTime(new Date().toISOString())} • Hospital EMR System
            </div>
          </div>
          
          ${imagesHTML ? `<div class="container" style="margin-top: 40px;">${imagesHTML}</div>` : ''}
        </body>
      </html>
    `;
  };

  const handleDownloadHTML = async () => {
    const htmlContent = await generateFullHTML();
    
    // Create and download HTML file (can be printed to PDF from browser)
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Encounter_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Copy button - icon only, compact on all screens */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleCopyText}
        className="px-2"
        title={copied ? "Copied to clipboard!" : "Copy encounter text"}
      >
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
      
      {/* HTML button - icon only, compact on all screens */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownloadHTML}
        className="px-2"
        title="Download as HTML"
      >
        <FileCode className="w-4 h-4" />
      </Button>
    </>
  );
}

