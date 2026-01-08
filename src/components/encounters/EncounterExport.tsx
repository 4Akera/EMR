"use client";

import { Copy, Check, FileCode } from "lucide-react";
import { Button } from "@/components/ui";
import { useState } from "react";
import type { Encounter, Patient, EncounterAction, EncounterFile, PatientDetails } from "@/lib/types/database";
import { formatDateTime, getActionTypeLabel } from "@/lib/utils";

interface EncounterExportProps {
  encounter: Encounter;
  patient: Patient;
  patientDetails?: PatientDetails | null;
  actions?: EncounterAction[];
  files?: EncounterFile[];
}

export function EncounterExport({ 
  encounter, 
  patient, 
  patientDetails,
  actions = [],
  files = []
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

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      case 'DISCHARGED': return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
      case 'DECEASED': return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'VITALS': return '❤️';
      case 'NOTE': return '📝';
      case 'ORDER': return '📋';
      case 'LAB': return '🧪';
      case 'IMAGING': return '📸';
      case 'PROCEDURE': return '⚕️';
      case 'MEDICATION': return '💊';
      case 'CONSULT': return '👨‍⚕️';
      default: return '📌';
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'VITALS': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
      case 'NOTE': return { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' };
      case 'ORDER': return { bg: '#fefce8', border: '#fde047', text: '#ca8a04' };
      case 'LAB': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
      case 'IMAGING': return { bg: '#fdf4ff', border: '#f0abfc', text: '#a855f7' };
      case 'PROCEDURE': return { bg: '#fff7ed', border: '#fdba74', text: '#ea580c' };
      case 'MEDICATION': return { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2' };
      case 'CONSULT': return { bg: '#faf5ff', border: '#e9d5ff', text: '#9333ea' };
      default: return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' };
    }
  };

  // Get files associated with an action
  const getActionFiles = (actionId: string) => {
    return files.filter(f => f.actionId === actionId);
  };

  // Get investigation images (files not attached to timeline items, or all image files)
  const getInvestigationImages = () => {
    return files.filter(f => f.fileType.startsWith('image/'));
  };

  const generateFullHTML = () => {
    const statusColors = getStatusColor(encounter.status);
    const imageFiles = getInvestigationImages();
    
    // Sort actions chronologically
    const sortedActions = [...actions].sort((a, b) => 
      new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime()
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>${patient.fullName} - Encounter Summary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0284c7;
      --primary-dark: #0369a1;
      --primary-light: #e0f2fe;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #1e293b;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border: #e2e8f0;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Print Button */
    .print-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(2, 132, 199, 0.4);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    .print-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(2, 132, 199, 0.5);
    }
    
    .print-fab:active {
      transform: scale(0.95);
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%);
      color: white;
      padding: 32px 20px;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 60%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
      pointer-events: none;
    }
    
    .header-content {
      max-width: 800px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    
    .patient-name {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .patient-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 14px;
      opacity: 0.95;
    }
    
    .patient-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 16px;
      background: ${statusColors.bg};
      color: ${statusColors.text};
      border: 2px solid ${statusColors.border};
    }
    
    /* Main Content */
    .main {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px 100px;
    }
    
    /* Cards */
    .card {
      background: var(--card);
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
      margin-bottom: 20px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(to bottom, #fafbfc, #f8f9fa);
    }
    
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
    }
    
    .card-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    
    .card-body {
      padding: 20px;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
    }
    
    .info-item {
      padding: 12px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    
    .info-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      word-break: break-word;
    }
    
    /* Text Content */
    .text-section {
      margin-bottom: 20px;
    }
    
    .text-section:last-child {
      margin-bottom: 0;
    }
    
    .text-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .text-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, var(--border), transparent);
    }
    
    .text-content {
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.8;
      color: var(--text);
      font-size: 14px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
      border-left: 3px solid var(--primary);
    }
    
    .text-content.alert {
      background: #fef2f2;
      border-left-color: #ef4444;
      color: #991b1b;
    }
    
    .text-content.highlight {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left-color: #2563eb;
      font-weight: 500;
    }
    
    /* Timeline */
    .timeline {
      position: relative;
    }
    
    .timeline::before {
      content: '';
      position: absolute;
      left: 20px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, var(--primary), var(--border));
    }
    
    .timeline-item {
      position: relative;
      padding-left: 52px;
      padding-bottom: 24px;
    }
    
    .timeline-item:last-child {
      padding-bottom: 0;
    }
    
    .timeline-marker {
      position: absolute;
      left: 8px;
      top: 0;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background: var(--card);
      border: 2px solid var(--primary);
      z-index: 1;
    }
    
    .timeline-card {
      background: var(--card);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
      transition: all 0.2s ease;
    }
    
    .timeline-header {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .timeline-type {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .timeline-time {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .timeline-content {
      padding: 0 16px 16px;
    }
    
    .timeline-text {
      color: var(--text);
      line-height: 1.7;
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .timeline-images {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    
    .timeline-image {
      width: 100%;
      max-height: 300px;
      object-fit: contain;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s ease;
      background: #f8fafc;
      border: 1px solid var(--border);
    }
    
    .timeline-image:hover {
      transform: scale(1.02);
    }
    
    /* Image Gallery */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    
    .gallery-item {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      background: #f1f5f9;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    
    .gallery-image {
      width: 100%;
      max-height: 400px;
      min-height: 200px;
      object-fit: contain;
      display: block;
      cursor: pointer;
      transition: transform 0.3s ease;
      background: #ffffff;
    }
    
    .gallery-item:hover .gallery-image {
      transform: scale(1.02);
    }
    
    .gallery-caption {
      padding: 10px;
      background: var(--card);
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    .gallery-caption strong {
      display: block;
      color: var(--text);
      font-size: 12px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* Lightbox */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.95);
      z-index: 10000;
      padding: 20px;
      justify-content: center;
      align-items: center;
    }
    
    .lightbox.active {
      display: flex;
    }
    
    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    .lightbox-close:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.1);
    }
    
    .lightbox-img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
    }
    
    .lightbox-caption {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      text-align: center;
      color: white;
      font-size: 14px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
    
    /* Discharge Section */
    .discharge-card {
      background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
      border: 2px solid #93c5fd;
    }
    
    .discharge-card .card-header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border-bottom: none;
    }
    
    .discharge-card .card-icon {
      background: rgba(255,255,255,0.2);
      color: white;
    }
    
    .discharge-card .card-title {
      color: white;
    }
    
    .discharge-note {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
      white-space: pre-wrap;
      line-height: 1.8;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border);
      background: var(--card);
      margin-top: 40px;
    }
    
    .footer-logo {
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 4px;
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
        font-size: 11pt;
      }
      
      .print-fab {
        display: none !important;
      }
      
      .header {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .card {
        box-shadow: none;
        break-inside: avoid;
        border: 1px solid #ddd;
      }
      
      .timeline-item {
        break-inside: avoid;
      }
      
      .gallery-item {
        break-inside: avoid;
      }
      
      .lightbox {
        display: none !important;
      }
      
      .main {
        padding-bottom: 20px;
      }
    }
    
    /* Mobile Optimizations */
    @media (max-width: 480px) {
      .header {
        padding: 24px 16px;
      }
      
      .patient-name {
        font-size: 22px;
      }
      
      .patient-meta {
        gap: 12px;
        font-size: 13px;
      }
      
      .main {
        padding: 16px 12px 100px;
      }
      
      .card {
        border-radius: 12px;
        margin-bottom: 16px;
      }
      
      .card-header {
        padding: 12px 16px;
      }
      
      .card-body {
        padding: 16px;
      }
      
      .info-grid {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .info-item {
        padding: 10px;
      }
      
      .timeline::before {
        left: 16px;
      }
      
      .timeline-item {
        padding-left: 44px;
      }
      
      .timeline-marker {
        left: 4px;
        width: 24px;
        height: 24px;
        font-size: 10px;
      }
      
      .timeline-images {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      
      .timeline-image {
        max-height: 250px;
      }
      
      .gallery-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .gallery-image {
        max-height: 300px;
        min-height: 150px;
      }
      
      .print-fab {
        bottom: 16px;
        right: 16px;
        width: 48px;
        height: 48px;
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <!-- Print FAB -->
  <button class="print-fab" onclick="window.print()" title="Print / Save as PDF">🖨️</button>
  
  <!-- Lightbox -->
  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <button class="lightbox-close" onclick="closeLightbox()">✕</button>
    <img class="lightbox-img" id="lightbox-img" src="" alt="">
    <div class="lightbox-caption" id="lightbox-caption"></div>
  </div>
  
  <!-- Header -->
  <header class="header">
    <div class="header-content">
      <h1 class="patient-name">${patient.fullName}</h1>
      <div class="patient-meta">
        <span class="patient-meta-item">
          <span>🎂</span>
          <span>${calculateAge(patient.birthDate)} years old</span>
        </span>
        <span class="patient-meta-item">
          <span>${patient.sex === 'M' ? '♂️' : patient.sex === 'F' ? '♀️' : '⚧️'}</span>
          <span>${patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : patient.sex === 'U' ? 'Unknown' : 'Unknown'}</span>
        </span>
        ${patient.mrn ? `
        <span class="patient-meta-item">
          <span>🏥</span>
          <span>MRN: ${patient.mrn}</span>
        </span>
        ` : ''}
      </div>
      <div class="status-badge">
        ${encounter.status === 'ACTIVE' ? '🟢' : encounter.status === 'DISCHARGED' ? '🔵' : '⚫'} 
        ${encounter.status}
      </div>
    </div>
  </header>
  
  <!-- Main Content -->
  <main class="main">
    <!-- Encounter Info -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #e0f2fe; color: #0284c7;">📋</div>
        <div>
          <div class="card-title">Encounter Details</div>
          <div class="card-subtitle">Admission and location information</div>
        </div>
      </div>
      <div class="card-body">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Admission Date</div>
            <div class="info-value">${formatDateTime(encounter.startAt)}</div>
          </div>
          ${encounter.endAt ? `
          <div class="info-item">
            <div class="info-label">${encounter.status === 'DISCHARGED' ? 'Discharge Date' : 'End Date'}</div>
            <div class="info-value">${formatDateTime(encounter.endAt)}</div>
          </div>
          ` : ''}
          ${encounter.currentLocation ? `
          <div class="info-item">
            <div class="info-label">Location</div>
            <div class="info-value">${encounter.currentLocation}</div>
          </div>
          ` : ''}
          ${patient.phone ? `
          <div class="info-item">
            <div class="info-label">Contact</div>
            <div class="info-value">${patient.phone}</div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    
    ${patientDetails && (patientDetails.pmh || patientDetails.psh || patientDetails.allergies || patientDetails.currentMeds) ? `
    <!-- Medical History -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #fef3c7; color: #d97706;">📚</div>
        <div>
          <div class="card-title">Medical History</div>
          <div class="card-subtitle">Background medical information</div>
        </div>
      </div>
      <div class="card-body">
        ${patientDetails.allergies ? `
        <div class="text-section">
          <div class="text-label">⚠️ Allergies</div>
          <div class="text-content alert">${patientDetails.allergies}</div>
        </div>
        ` : ''}
        ${patientDetails.pmh ? `
        <div class="text-section">
          <div class="text-label">Past Medical History</div>
          <div class="text-content">${patientDetails.pmh}</div>
        </div>
        ` : ''}
        ${patientDetails.psh ? `
        <div class="text-section">
          <div class="text-label">Past Surgical History</div>
          <div class="text-content">${patientDetails.psh}</div>
        </div>
        ` : ''}
        ${patientDetails.currentMeds ? `
        <div class="text-section">
          <div class="text-label">Current Medications</div>
          <div class="text-content">${patientDetails.currentMeds}</div>
        </div>
        ` : ''}
        ${patientDetails.familyHx ? `
        <div class="text-section">
          <div class="text-label">Family History</div>
          <div class="text-content">${patientDetails.familyHx}</div>
        </div>
        ` : ''}
        ${patientDetails.socialHx ? `
        <div class="text-section">
          <div class="text-label">Social History</div>
          <div class="text-content">${patientDetails.socialHx}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
    
    ${encounter.cc || encounter.hpi || encounter.ros || encounter.physicalExam ? `
    <!-- Clinical Documentation -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #dcfce7; color: #16a34a;">🩺</div>
        <div>
          <div class="card-title">Clinical Documentation</div>
          <div class="card-subtitle">History and examination findings</div>
        </div>
      </div>
      <div class="card-body">
        ${encounter.cc ? `
        <div class="text-section">
          <div class="text-label">Chief Complaint</div>
          <div class="text-content highlight">${encounter.cc}</div>
        </div>
        ` : ''}
        ${encounter.hpi ? `
        <div class="text-section">
          <div class="text-label">History of Present Illness</div>
          <div class="text-content">${encounter.hpi}</div>
        </div>
        ` : ''}
        ${encounter.ros ? `
        <div class="text-section">
          <div class="text-label">Review of Systems</div>
          <div class="text-content">${encounter.ros}</div>
        </div>
        ` : ''}
        ${encounter.physicalExam ? `
        <div class="text-section">
          <div class="text-label">Physical Examination</div>
          <div class="text-content">${encounter.physicalExam}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
    
    ${encounter.investigations || encounter.summary || imageFiles.length > 0 ? `
    <!-- Investigations, Assessments & Plan -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #fce7f3; color: #db2777;">🔬</div>
        <div>
          <div class="card-title">Investigations & Plan</div>
          <div class="card-subtitle">Diagnostic workup and management</div>
        </div>
      </div>
      <div class="card-body">
        ${encounter.investigations ? `
        <div class="text-section">
          <div class="text-label">Investigations</div>
          <div class="text-content">${encounter.investigations}</div>
        </div>
        ` : ''}
        
        ${imageFiles.length > 0 ? `
        <div class="text-section">
          <div class="text-label">📸 Clinical Images & Investigation Results</div>
          <div class="gallery-grid" style="margin-top: 12px;">
            ${imageFiles.map(file => `
              <div class="gallery-item">
                <img 
                  src="${file.fileUrl}" 
                  alt="${file.fileName}"
                  class="gallery-image"
                  onclick="openLightbox('${file.fileUrl}', '${file.caption || file.fileName}')"
                >
                <div class="gallery-caption">
                  <strong>${file.fileName}</strong>
                  ${file.caption ? `<div>${file.caption}</div>` : ''}
                  <div style="color: #94a3b8; margin-top: 4px; font-size: 10px;">${formatDateTime(file.createdAt)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        ${encounter.summary ? `
        <div class="text-section">
          <div class="text-label">Summary / Plan</div>
          <div class="text-content highlight">${encounter.summary}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
    
    ${encounter.primaryDx || encounter.problemListText ? `
    <!-- Diagnosis -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #fee2e2; color: #dc2626;">🎯</div>
        <div>
          <div class="card-title">Diagnosis</div>
          <div class="card-subtitle">Working and final diagnoses</div>
        </div>
      </div>
      <div class="card-body">
        ${encounter.primaryDx ? `
        <div class="text-section">
          <div class="text-label">Primary / Final Diagnosis</div>
          <div class="text-content highlight">${encounter.primaryDx}</div>
        </div>
        ` : ''}
        ${encounter.problemListText ? `
        <div class="text-section">
          <div class="text-label">Problem List</div>
          <div class="text-content">${encounter.problemListText}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
    
    ${sortedActions.length > 0 ? `
    <!-- Timeline -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #e0e7ff; color: #4f46e5;">⏱️</div>
        <div>
          <div class="card-title">Encounter Timeline</div>
          <div class="card-subtitle">${sortedActions.length} entries recorded</div>
        </div>
      </div>
      <div class="card-body">
        <div class="timeline">
          ${sortedActions.map((action, index) => {
            const actionColors = getActionColor(action.type);
            const actionFiles = getActionFiles(action.id);
            const actionImages = actionFiles.filter(f => f.fileType.startsWith('image/'));
            
            return `
            <div class="timeline-item">
              <div class="timeline-marker">${getActionIcon(action.type)}</div>
              <div class="timeline-card">
                <div class="timeline-header" style="background: ${actionColors.bg};">
                  <span class="timeline-type" style="background: ${actionColors.border}; color: ${actionColors.text};">
                    ${getActionTypeLabel(action.type)}
                  </span>
                  <span class="timeline-time">${formatDateTime(action.eventAt)}</span>
                </div>
                <div class="timeline-content">
                  <div class="timeline-text">${action.text || ''}</div>
                  ${actionImages.length > 0 ? `
                  <div class="timeline-images">
                    ${actionImages.map(img => `
                      <img 
                        src="${img.fileUrl}" 
                        alt="${img.fileName}"
                        class="timeline-image"
                        onclick="openLightbox('${img.fileUrl}', '${img.caption || img.fileName}')"
                      >
                    `).join('')}
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    ` : ''}
    
    ${imageFiles.length > 0 ? `
    <!-- All Attached Images Gallery -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background: #fae8ff; color: #a855f7;">📷</div>
        <div>
          <div class="card-title">All Attached Images</div>
          <div class="card-subtitle">${imageFiles.length} images • Complete gallery view</div>
        </div>
      </div>
      <div class="card-body">
        <div class="gallery-grid">
          ${imageFiles.map(file => `
            <div class="gallery-item">
              <img 
                src="${file.fileUrl}" 
                alt="${file.fileName}"
                class="gallery-image"
                onclick="openLightbox('${file.fileUrl}', '${file.caption || file.fileName}')"
              >
              <div class="gallery-caption">
                <strong>${file.fileName}</strong>
                ${file.caption ? `<div>${file.caption}</div>` : ''}
                <div style="color: #94a3b8; margin-top: 4px;">${formatDateTime(file.createdAt)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    ` : ''}
    
    ${encounter.status === 'DISCHARGED' && encounter.dischargeNote ? `
    <!-- Discharge Summary -->
    <div class="card discharge-card">
      <div class="card-header">
        <div class="card-icon">🏠</div>
        <div>
          <div class="card-title">Discharge Summary</div>
          <div class="card-subtitle" style="color: rgba(255,255,255,0.8);">
            ${encounter.dischargeAt ? `Discharged on ${formatDateTime(encounter.dischargeAt)}` : 'Patient discharged'}
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="discharge-note">${encounter.dischargeNote}</div>
      </div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <footer class="footer">
      <div class="footer-logo">Hospital EMR System</div>
      <div>Generated on ${formatDateTime(new Date().toISOString())}</div>
    </footer>
  </main>
  
  <script>
    function openLightbox(src, caption) {
      const lightbox = document.getElementById('lightbox');
      const img = document.getElementById('lightbox-img');
      const cap = document.getElementById('lightbox-caption');
      img.src = src;
      cap.textContent = caption;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    function closeLightbox() {
      const lightbox = document.getElementById('lightbox');
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeLightbox();
    });
  </script>
</body>
</html>`;
  };

  const handleCopyText = async () => {
    // Generate plain text version for clipboard
    const textLines: string[] = [];
    textLines.push("═".repeat(50));
    textLines.push("ENCOUNTER SUMMARY");
    textLines.push("═".repeat(50));
    textLines.push("");
    textLines.push(`Patient: ${patient.fullName}`);
    textLines.push(`Age/Sex: ${calculateAge(patient.birthDate)} years / ${patient.sex || 'Unknown'}`);
    textLines.push(`MRN: ${patient.mrn || 'N/A'}`);
    textLines.push(`Status: ${encounter.status}`);
    textLines.push(`Admission: ${formatDateTime(encounter.startAt)}`);
    if (encounter.endAt) {
      textLines.push(`${encounter.status === 'DISCHARGED' ? 'Discharge' : 'End'}: ${formatDateTime(encounter.endAt)}`);
    }
    textLines.push("");
    
    if (patientDetails?.allergies) {
      textLines.push("⚠️ ALLERGIES: " + patientDetails.allergies);
      textLines.push("");
    }
    
    if (encounter.cc) {
      textLines.push("─".repeat(40));
      textLines.push("CHIEF COMPLAINT:");
      textLines.push(encounter.cc);
      textLines.push("");
    }
    
    if (encounter.hpi) {
      textLines.push("─".repeat(40));
      textLines.push("HISTORY OF PRESENT ILLNESS:");
      textLines.push(encounter.hpi);
      textLines.push("");
    }
    
    if (encounter.physicalExam) {
      textLines.push("─".repeat(40));
      textLines.push("PHYSICAL EXAMINATION:");
      textLines.push(encounter.physicalExam);
      textLines.push("");
    }
    
    if (encounter.investigations) {
      textLines.push("─".repeat(40));
      textLines.push("INVESTIGATIONS:");
      textLines.push(encounter.investigations);
      textLines.push("");
    }
    
    if (encounter.primaryDx) {
      textLines.push("─".repeat(40));
      textLines.push("PRIMARY DIAGNOSIS:");
      textLines.push(encounter.primaryDx);
      textLines.push("");
    }
    
    if (encounter.summary) {
      textLines.push("─".repeat(40));
      textLines.push("SUMMARY / PLAN:");
      textLines.push(encounter.summary);
      textLines.push("");
    }
    
    if (actions.length > 0) {
      textLines.push("─".repeat(40));
      textLines.push("TIMELINE:");
      const sorted = [...actions].sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());
      sorted.forEach((a, i) => {
        textLines.push(`${i + 1}. [${getActionTypeLabel(a.type)}] ${formatDateTime(a.eventAt)}`);
        textLines.push(`   ${a.text}`);
      });
      textLines.push("");
    }
    
    if (encounter.dischargeNote) {
      textLines.push("─".repeat(40));
      textLines.push("DISCHARGE NOTE:");
      textLines.push(encounter.dischargeNote);
    }
    
    textLines.push("");
    textLines.push("═".repeat(50));
    textLines.push(`Generated: ${formatDateTime(new Date().toISOString())}`);
    
    try {
      await navigator.clipboard.writeText(textLines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateFullHTML();
    
    // Create and download HTML file
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
