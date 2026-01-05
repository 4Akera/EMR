"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Encounter,
  Patient,
  EncounterAction,
  EncounterMedication,
  EncounterFile,
  EncounterUpdate,
  EncounterActionInsert,
  EncounterActionUpdate,
  EncounterMedicationInsert,
  EncounterMedicationUpdate,
  EncounterFileInsert,
  EncounterFileUpdate,
  Profile,
} from "@/lib/types/database";
import {
  formatDateTime,
  formatDateTimeForInput,
  getActionTypeLabel,
  getActionTypeColor,
  formatRelativeTime,
  calculateAge,
} from "@/lib/utils";
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Modal,
  EmptyState,
} from "@/components/ui";
import {
  ArrowLeft,
  Activity,
  MapPin,
  Clock,
  Save,
  AlertTriangle,
  FileText,
  ListChecks,
  Stethoscope,
  ArrowRightLeft,
  Pill,
  Plus,
  Trash2,
  Square,
  Play,
  Edit2,
  X,
  Image as ImageIcon,
  Paperclip,
  Calendar,
  ChevronDown,
  Send,
  User,
  Users,
  LogOut,
  Skull,
  Camera,
} from "lucide-react";
import { EncounterExport } from "@/components/encounters/EncounterExport";

const ACTION_TYPES = [
  { value: "NOTE", label: "📝 Note / Tour" },
  { value: "REASONING", label: "🧠 Clinical Reasoning" },
  { value: "TX", label: "💊 Treatment" },
  { value: "INV", label: "🔬 Investigation" },
  { value: "VITALS", label: "📊 Vitals" },
  { value: "TRANSFER", label: "🚑 Transfer" },
];

export default function EncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params.encounterId as string;
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const investigationCameraRef = useRef<HTMLInputElement>(null);
  const investigationGalleryRef = useRef<HTMLInputElement>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [actions, setActions] = useState<EncounterAction[]>([]);
  const [medications, setMedications] = useState<EncounterMedication[]>([]);
  const [files, setFiles] = useState<EncounterFile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  // Helper to get user display name
  const getUserName = (userId: string | null | undefined): string => {
    if (!userId) return "";
    const profile = profiles[userId];
    return profile?.displayName || "Unknown User";
  };

  // Form states
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingDx, setIsSavingDx] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"discharge" | "deceased" | null>(null);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);
  const [dischargeNote, setDischargeNote] = useState("");
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    history: false,
    examination: false,
    investigations: false,
    plan: false,
  });

  // Main card sections state - collapsed by default
  const [expandedCards, setExpandedCards] = useState({
    diagnosis: false,
    clinical: false,
    timeline: true, // Keep timeline open for quick access
    medications: false,
    files: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleCard = (card: keyof typeof expandedCards) => {
    setExpandedCards(prev => ({ ...prev, [card]: !prev[card] }));
  };

  // Notes form
  const [notesForm, setNotesForm] = useState({
    cc: "",
    hpi: "",
    ros: "",
    physicalExam: "",
    investigations: "",
    summary: "",
  });

  // Dx form
  const [dxForm, setDxForm] = useState({
    primaryDx: "",
    problemListText: "",
  });

  // Timeline action form - redesigned
  const [actionForm, setActionForm] = useState({
    type: "NOTE",
    text: "",
    eventAt: "",
    transferTo: "",
  });
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [editingAction, setEditingAction] = useState<EncounterAction | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Medication form
  const [medForm, setMedForm] = useState({
    name: "",
    dose: "",
    route: "",
    frequency: "",
    indication: "",
    notes: "",
  });
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<EncounterMedication | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);
  const [creatinine, setCreatinine] = useState("");

  // Weight editing
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  // Vitals editing
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [vitalsInput, setVitalsInput] = useState({
    bp: "",
    hr: "",
    rr: "",
    temp: "",
    spo2: "",
  });
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [lastVitals, setLastVitals] = useState<EncounterAction | null>(null);

  // File viewer
  const [viewingFile, setViewingFile] = useState<EncounterFile | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

    // Fetch all profiles for user display
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*");
    
    if (profilesData) {
      const profilesMap: Record<string, Profile> = {};
      (profilesData as Profile[]).forEach(p => {
        profilesMap[p.id] = p;
      });
      setProfiles(profilesMap);
    }

    // Fetch encounter
    const { data: encounterData } = await supabase
      .from("encounters")
      .select("*")
      .eq("id", encounterId)
      .single();

    if (encounterData) {
      const enc = encounterData as Encounter;
      setEncounter(enc);
      setNotesForm({
        cc: enc.cc || "",
        hpi: enc.hpi || "",
        ros: enc.ros || "",
        physicalExam: enc.physicalExam || "",
        investigations: enc.investigations || "",
        summary: enc.summary || "",
      });
      setDxForm({
        primaryDx: enc.primaryDx || "",
        problemListText: enc.problemListText || "",
      });

      // Auto-collapse diagnosis and clinical sections if they have existing data
      // (patient re-entry for adjustment)
      const hasExistingDiagnosis = enc.primaryDx || enc.problemListText;
      const hasExistingClinical = enc.cc || enc.hpi || enc.ros || enc.physicalExam || enc.investigations || enc.summary;
      
      setExpandedCards(prev => ({
        ...prev,
        diagnosis: !hasExistingDiagnosis, // Collapse if data exists
        clinical: !hasExistingClinical,   // Collapse if data exists
      }));

      // Fetch patient
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", enc.patientId)
        .single();

      if (patientData) {
        setPatient(patientData as Patient);
        
        // Fetch patient details (weight, height, etc.)
        const { data: detailsData } = await supabase
          .from("patient_details")
          .select("*")
          .eq("patientId", enc.patientId)
          .single();
        
        if (detailsData) {
          setPatientDetails(detailsData);
        }
      }
    }

    // Fetch actions
    const { data: actionsData } = await supabase
      .from("encounter_actions")
      .select("*")
      .eq("encounterId", encounterId)
      .is("deletedAt", null)
      .order("eventAt", { ascending: false });

    if (actionsData) {
      const actions = actionsData as EncounterAction[];
      setActions(actions);
      
      // Find the most recent vitals entry
      const recentVitals = actions.find(a => a.type === "VITALS");
      setLastVitals(recentVitals || null);
    }

    // Fetch medications
    const { data: medsData } = await supabase
      .from("encounter_medications")
      .select("*")
      .eq("encounterId", encounterId)
      .is("deletedAt", null)
      .order("startAt", { ascending: false });

    if (medsData) {
      setMedications(medsData as EncounterMedication[]);
    }

    // Fetch files
    const { data: filesData, error: filesError } = await supabase
      .from("encounter_files")
      .select("*")
      .eq("encounterId", encounterId)
      .is("deletedAt", null)
      .order("createdAt", { ascending: false });

    console.log("Files data:", filesData);
    console.log("Files error:", filesError);

    if (filesData) {
      setFiles(filesData as EncounterFile[]);
      console.log("Files state set:", filesData.length, "files");
    }

    setIsLoading(false);
  }, [supabase, encounterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close vitals editor if encounter becomes inactive
  useEffect(() => {
    if (encounter && encounter.status !== "ACTIVE") {
      setIsEditingVitals(false);
    }
  }, [encounter]);

  // Auto-recalculate dose when weight changes and dose contains formula
  useEffect(() => {
    if (!patientDetails?.weight || !isMedModalOpen || !medForm.dose.includes('(')) return;
    
    // Extract formula from dose like "1050 mg (15 mg/kg)" -> "15 mg/kg"
    const formulaMatch = medForm.dose.match(/\(([^)]+)\)/);
    if (formulaMatch) {
      const formula = formulaMatch[1];
      const weight = parseFloat(patientDetails.weight);
      
      // Re-match pattern and recalculate
      const patterns = [
        /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\/kg$/i,
        /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\s+per\s+kg$/i,
      ];
      
      for (const pattern of patterns) {
        const match = formula.match(pattern);
        if (match) {
          const dosePerKg = parseFloat(match[1]);
          const unit = match[2];
          
          if (!isNaN(dosePerKg) && !isNaN(weight)) {
            const calculated = weight * dosePerKg;
            const calculatedDose = calculated % 1 === 0 
              ? calculated.toFixed(0) 
              : calculated.toFixed(2).replace(/\.?0+$/, '');
            
            setMedForm(prev => ({ 
              ...prev, 
              dose: `${calculatedDose} ${unit} (${formula})` 
            }));
          }
          break;
        }
      }
    }
  }, [patientDetails?.weight, isMedModalOpen]);

  // Status update handlers
  const handleStatusChange = async () => {
    if (!statusAction) return;
    setIsProcessingStatus(true);

    const newStatus = statusAction === "discharge" ? "DISCHARGED" : "DECEASED";
    const now = new Date().toISOString();

    const updateData: EncounterUpdate = {
      status: newStatus,
      endAt: now,
      dischargeNote: statusAction === "discharge" ? dischargeNote.trim() || null : null,
      dischargeAt: statusAction === "discharge" ? now : null,
      updatedBy: currentUserId,
    };

    const { error: updateError } = await supabase
      .from("encounters")
      .update(updateData as never)
      .eq("id", encounterId);

    if (updateError) {
      console.error("Error updating encounter:", updateError);
      alert("Failed to update encounter: " + updateError.message);
      setIsProcessingStatus(false);
      return;
    }

    const actionText = statusAction === "discharge" 
      ? `Patient discharged${dischargeNote.trim() ? ': ' + dischargeNote.trim() : ''}`
      : "Patient deceased";

    const actionData: EncounterActionInsert = {
      encounterId,
      type: "NOTE",
      text: actionText,
      eventAt: now,
      createdBy: currentUserId,
    };

    await supabase.from("encounter_actions").insert(actionData as never);

    setIsStatusModalOpen(false);
    setStatusAction(null);
    setDischargeNote("");
    fetchData();
    setIsProcessingStatus(false);
  };

  // Notes handlers
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotes(true);

    const updateData: EncounterUpdate = {
      cc: notesForm.cc.trim() || null,
      hpi: notesForm.hpi.trim() || null,
      ros: notesForm.ros.trim() || null,
      physicalExam: notesForm.physicalExam.trim() || null,
      investigations: notesForm.investigations.trim() || null,
      summary: notesForm.summary.trim() || null,
      updatedBy: currentUserId,
    };

    const { error } = await supabase
      .from("encounters")
      .update(updateData as never)
      .eq("id", encounterId);

    if (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes: " + error.message);
    }

    fetchData();
    setIsSavingNotes(false);
  };

  // Dx handlers
  const handleSaveDx = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDx(true);

    const updateData: EncounterUpdate = {
      primaryDx: dxForm.primaryDx.trim() || null,
      problemListText: dxForm.problemListText.trim() || null,
      updatedBy: currentUserId,
    };

    const { error } = await supabase
      .from("encounters")
      .update(updateData as never)
      .eq("id", encounterId);

    if (error) {
      console.error("Error saving diagnosis:", error);
      alert("Failed to save diagnosis: " + error.message);
    }

    fetchData();
    setIsSavingDx(false);
  };

  // File upload handler with size limit and compression
  const MAX_FILE_SIZE = 200 * 1024; // 200KB limit
  const MAX_IMAGE_DIMENSION = 1280; // Max width/height for images
  const IMAGE_QUALITY = 0.6; // JPEG quality (0-1)

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height && width > MAX_IMAGE_DIMENSION) {
            height = (height / width) * MAX_IMAGE_DIMENSION;
            width = MAX_IMAGE_DIMENSION;
          } else if (height > MAX_IMAGE_DIMENSION) {
            width = (width / height) * MAX_IMAGE_DIMENSION;
            height = MAX_IMAGE_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                console.log(
                  `Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(
                    compressedFile.size / 1024
                  ).toFixed(1)}KB`
                );
                resolve(compressedFile);
              } else {
                reject(new Error("Compression failed"));
              }
            },
            "image/jpeg",
            IMAGE_QUALITY
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const processedFiles: File[] = [];

    for (const file of selectedFiles) {
      try {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          // If it's an image, try to compress it
          if (file.type.startsWith("image/")) {
            const compressed = await compressImage(file);
            if (compressed.size > MAX_FILE_SIZE) {
              alert(
                `${file.name} is too large even after compression. Max size is ${(
                  MAX_FILE_SIZE /
                  1024 /
                  1024
                ).toFixed(1)}MB`
              );
              continue;
            }
            processedFiles.push(compressed);
          } else {
            alert(
              `${file.name} is too large. Max size is ${(
                MAX_FILE_SIZE /
                1024 /
                1024
              ).toFixed(1)}MB`
            );
            continue;
          }
        } else {
          // File is small enough, but still compress images for faster upload
          if (file.type.startsWith("image/")) {
            const compressed = await compressImage(file);
            processedFiles.push(compressed);
          } else {
            processedFiles.push(file);
          }
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        alert(`Failed to process ${file.name}`);
      }
    }

    setPendingFiles((prev) => [...prev, ...processedFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (actionId?: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of pendingFiles) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${encounterId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      console.log("Uploading file:", fileName);

      const { data, error } = await supabase.storage
        .from("encounter-files")
        .upload(fileName, file);

      console.log("Upload result:", { data, error });

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from("encounter-files")
          .getPublicUrl(data.path);

        console.log("Public URL:", urlData.publicUrl);

        const fileInsert: EncounterFileInsert = {
          encounterId,
          actionId: actionId || null,
          fileName: file.name,
          fileType: file.type,
          fileUrl: urlData.publicUrl,
          fileSize: file.size,
        };

        const { data: insertData, error: insertError } = await supabase
          .from("encounter_files")
          .insert(fileInsert as never)
          .select();

        console.log("Insert result:", { insertData, insertError });

        uploadedUrls.push(urlData.publicUrl);
      } else {
        console.error("Upload error:", error);
      }
    }

    setPendingFiles([]);
    return uploadedUrls;
  };

  // Action handlers - redesigned
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For transfer type, require transferTo
    if (actionForm.type === "TRANSFER" && !actionForm.transferTo.trim()) {
      return;
    }
    
    // For other types, require text
    if (actionForm.type !== "TRANSFER" && !actionForm.text.trim() && pendingFiles.length === 0) {
      return;
    }

    setIsAddingAction(true);

    const eventAt = actionForm.eventAt || new Date().toISOString();
    let text = actionForm.text.trim();

    // Handle transfer
    if (actionForm.type === "TRANSFER") {
      const currentLoc = encounter?.currentLocation || "Unknown";
      text = `Transferred from ${currentLoc} to ${actionForm.transferTo.trim()}`;

      // Update current location
      const updateData: EncounterUpdate = {
        currentLocation: actionForm.transferTo.trim(),
      };

      await supabase
        .from("encounters")
        .update(updateData as never)
        .eq("id", encounterId);
    }

    if (editingAction) {
      const updateData: EncounterActionUpdate = {
        type: actionForm.type,
        text,
        eventAt,
        updatedBy: currentUserId,
      };

      await supabase
        .from("encounter_actions")
        .update(updateData as never)
        .eq("id", editingAction.id);

      // Upload any pending files
      if (pendingFiles.length > 0) {
        await uploadFiles(editingAction.id);
      }

      setEditingAction(null);
    } else {
      const insertData: EncounterActionInsert = {
        encounterId,
        type: actionForm.type,
        text: text || "Uploaded files",
        eventAt,
        createdBy: currentUserId,
      };

      const { data: newAction } = await supabase
        .from("encounter_actions")
        .insert(insertData as never)
        .select()
        .single();

      // Upload any pending files
      if (pendingFiles.length > 0 && newAction) {
        await uploadFiles((newAction as EncounterAction).id);
      }
    }

    setActionForm({ type: "NOTE", text: "", eventAt: "", transferTo: "" });
    setShowTimeInput(false);
    fetchData();
    setIsAddingAction(false);
  };

  const handleDeleteAction = async (action: EncounterAction) => {
    if (!confirm("Are you sure you want to delete this action?")) return;

    const updateData: EncounterActionUpdate = {
      deletedAt: new Date().toISOString(),
    };

    await supabase
      .from("encounter_actions")
      .update(updateData as never)
      .eq("id", action.id);

    fetchData();
  };

  const startEditAction = (action: EncounterAction) => {
    setEditingAction(action);
    setActionForm({
      type: action.type,
      text: action.text,
      eventAt: formatDateTimeForInput(action.eventAt),
      transferTo: "",
    });
    setShowTimeInput(true);
  };

  // Weight update handler
  const handleSaveWeight = async () => {
    if (!patient || !weightInput.trim()) return;
    setIsSavingWeight(true);

    const weight = parseFloat(weightInput);
    if (isNaN(weight)) {
      setIsSavingWeight(false);
      return;
    }

    const updateData = { weight };

    // Check if patient_details exists
    if (patientDetails) {
      await supabase
        .from("patient_details")
        .update(updateData as never)
        .eq("patientId", patient.id);
    } else {
      await supabase
        .from("patient_details")
        .insert({ patientId: patient.id, ...updateData } as never);
    }

    fetchData();
    setIsEditingWeight(false);
    setIsSavingWeight(false);
  };

  // Save vitals as a timeline entry
  const handleSaveVitals = async () => {
    if (!vitalsInput.bp && !vitalsInput.hr && !vitalsInput.rr && !vitalsInput.temp && !vitalsInput.spo2) {
      return; // At least one vital must be entered
    }
    setIsSavingVitals(true);

    // Format vitals into a readable text
    const vitalsText = [
      vitalsInput.bp && `BP: ${vitalsInput.bp} mmHg`,
      vitalsInput.hr && `HR: ${vitalsInput.hr} bpm`,
      vitalsInput.rr && `RR: ${vitalsInput.rr}/min`,
      vitalsInput.temp && `Temp: ${vitalsInput.temp}°C`,
      vitalsInput.spo2 && `SpO2: ${vitalsInput.spo2}%`,
    ].filter(Boolean).join(" | ");

    const actionData = {
      encounterId,
      type: "VITALS",
      text: vitalsText,
      eventAt: new Date().toISOString(),
      createdBy: currentUserId,
    };

    await supabase
      .from("encounter_actions")
      .insert(actionData as never);

    // Reset form and refresh
    setVitalsInput({ bp: "", hr: "", rr: "", temp: "", spo2: "" });
    setIsEditingVitals(false);
    setIsSavingVitals(false);
    fetchData();
  };

  // Calculate numeric age from birthDate
  const getNumericAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate GFR using Cockcroft-Gault equation
  const calculateGFR = (): number | null => {
    if (!creatinine || !patientDetails?.weight || !patient?.birthDate || !patient?.sex) {
      return null;
    }

    const cr = parseFloat(creatinine);
    const weight = parseFloat(patientDetails.weight);
    const age = getNumericAge(patient.birthDate);

    if (isNaN(cr) || isNaN(weight) || cr <= 0 || weight <= 0) {
      return null;
    }

    // Cockcroft-Gault: ((140 - age) × weight) / (72 × Cr) × (0.85 if female)
    let gfr = ((140 - age) * weight) / (72 * cr);
    
    // Multiply by 0.85 for females
    if (patient.sex === "F") {
      gfr *= 0.85;
    }

    return Math.round(gfr);
  };

  // Auto-detect and calculate dose from patterns like "10 mg/kg"
  const handleDoseChange = (value: string) => {
    setMedForm({ ...medForm, dose: value });
    
    if (!patientDetails?.weight || !value.trim()) return;
    
    // Pattern: number + space/no-space + unit + /kg or per kg
    // Examples: "10 mg/kg", "10mg/kg", "0.5 units/kg", "10 mg per kg", "5mcg/kg"
    const patterns = [
      /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\/kg$/i,
      /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\s+per\s+kg$/i,
      /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\s*\/\s*kg$/i,
    ];
    
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        const dosePerKg = parseFloat(match[1]);
        const unit = match[2];
        const weight = parseFloat(patientDetails.weight);
        
        if (!isNaN(dosePerKg) && !isNaN(weight)) {
          const calculated = weight * dosePerKg;
          // Remove trailing zeros: 1050.00 -> 1050, but keep 1050.5 -> 1050.5
          const calculatedDose = calculated % 1 === 0 
            ? calculated.toFixed(0) 
            : calculated.toFixed(2).replace(/\.?0+$/, '');
          
          // Update with calculated dose but keep the formula in parentheses
          setMedForm({ 
            ...medForm, 
            dose: `${calculatedDose} ${unit} (${value})` 
          });
        }
        break;
      }
    }
  };

  // Recalculate dose when weight changes
  useEffect(() => {
    const weight = patientDetails?.weight;
    const dose = medForm.dose;
    
    if (!weight || !dose) return;
    
    // Check if dose contains a formula in parentheses like "700 mg (10 mg/kg)"
    const formulaMatch = dose.match(/\(([\d.]+\s*(?:mg|g|mcg|µg|units?|ml|mL)\s*(?:\/|per)\s*kg)\)/i);
    
    if (!formulaMatch) return;
    
    const formula = formulaMatch[1]; // e.g., "10 mg/kg"
    
    // Extract dose per kg and unit from formula
    const patterns = [
      /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\/kg$/i,
      /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\s+per\s+kg$/i,
    ];
    
    for (const pattern of patterns) {
      const match = formula.match(pattern);
      if (match) {
        const dosePerKg = parseFloat(match[1]);
        const unit = match[2];
        const weightNum = parseFloat(weight);
        
        if (!isNaN(dosePerKg) && !isNaN(weightNum)) {
          const calculated = weightNum * dosePerKg;
          const calculatedDose = calculated % 1 === 0 
            ? calculated.toFixed(0) 
            : calculated.toFixed(2).replace(/\.?0+$/, '');
          
          // Check if the current calculated dose matches - if not, update
          const currentCalculated = dose.match(/^([\d.]+)/)?.[1];
          if (currentCalculated !== calculatedDose) {
            console.log(`Recalculating dose: ${currentCalculated} -> ${calculatedDose} (weight changed to ${weight}kg)`);
            // Update dose with new calculation
            setMedForm(prev => ({ 
              ...prev, 
              dose: `${calculatedDose} ${unit} (${formula})` 
            }));
          }
        }
        break;
      }
    }
  }, [patientDetails, medForm.dose]);

  // Recalculate all saved medications when weight changes
  useEffect(() => {
    const updateMedications = async () => {
      const weight = patientDetails?.weight;
      if (!weight || medications.length === 0) return;

      const weightNum = parseFloat(weight);
      if (isNaN(weightNum)) return;

      const updates: Promise<any>[] = [];

      medications.forEach((med) => {
        if (!med.dose) return;

        // Check if dose contains a formula in parentheses
        const formulaMatch = med.dose.match(/\(([\d.]+\s*(?:mg|g|mcg|µg|units?|ml|mL)\s*(?:\/|per)\s*kg)\)/i);
        
        if (!formulaMatch) return;

        const formula = formulaMatch[1];
        
        // Extract dose per kg and unit from formula
        const patterns = [
          /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\/kg$/i,
          /^([\d.]+)\s*(mg|g|mcg|µg|units?|ml|mL)\s+per\s+kg$/i,
        ];
        
        for (const pattern of patterns) {
          const match = formula.match(pattern);
          if (match) {
            const dosePerKg = parseFloat(match[1]);
            const unit = match[2];
            
            if (!isNaN(dosePerKg)) {
              const calculated = weightNum * dosePerKg;
              const calculatedDose = calculated % 1 === 0 
                ? calculated.toFixed(0) 
                : calculated.toFixed(2).replace(/\.?0+$/, '');
              
              // Check if the current calculated dose matches
              const currentCalculated = med.dose.match(/^([\d.]+)/)?.[1];
              if (currentCalculated !== calculatedDose) {
                const newDose = `${calculatedDose} ${unit} (${formula})`;
                console.log(`Updating medication ${med.name}: ${med.dose} -> ${newDose}`);
                
                // Add update promise
                updates.push(
                  (async () => {
                    await supabase
                      .from("encounter_medications")
                      .update({ dose: newDose } as never)
                      .eq("id", med.id);
                  })()
                );
              }
            }
            break;
          }
        }
      });

      // Wait for all updates to complete
      if (updates.length > 0) {
        await Promise.all(updates);
        fetchData();
      }
    };

    updateMedications();
  }, [patientDetails?.weight, medications, fetchData]);

  // Medication handlers
  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.name.trim()) return;
    setIsAddingMed(true);

    if (editingMed) {
      // Update existing medication
      const updateData = {
        name: medForm.name.trim(),
        dose: medForm.dose.trim() || null,
        route: medForm.route.trim() || null,
        frequency: medForm.frequency.trim() || null,
        indication: medForm.indication.trim() || null,
        notes: medForm.notes.trim() || null,
      };

      await supabase
        .from("encounter_medications")
        .update(updateData as never)
        .eq("id", editingMed.id);
    } else {
      // Add new medication
      const now = new Date().toISOString();

      const medData: EncounterMedicationInsert = {
        encounterId,
        name: medForm.name.trim(),
        dose: medForm.dose.trim() || null,
        route: medForm.route.trim() || null,
        frequency: medForm.frequency.trim() || null,
        indication: medForm.indication.trim() || null,
        notes: medForm.notes.trim() || null,
        startAt: now,
        status: "ACTIVE",
      };

      await supabase.from("encounter_medications").insert(medData as never);
    }

    setMedForm({
      name: "",
      dose: "",
      route: "",
      frequency: "",
      indication: "",
      notes: "",
    });
    setEditingMed(null);
    setIsMedModalOpen(false);
    fetchData();
    setIsAddingMed(false);
  };

  const handleStopMedication = async (med: EncounterMedication) => {
    const now = new Date().toISOString();

    const updateData: EncounterMedicationUpdate = {
      status: "STOPPED",
      stopAt: now,
    };

    await supabase
      .from("encounter_medications")
      .update(updateData as never)
      .eq("id", med.id);

    const actionData: EncounterActionInsert = {
      encounterId,
      type: "TX",
      text: `Stopped ${med.name}`,
      eventAt: now,
    };

    await supabase.from("encounter_actions").insert(actionData as never);

    fetchData();
  };

  const handleDeleteMedication = async (med: EncounterMedication) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;

    const updateData: EncounterMedicationUpdate = {
      deletedAt: new Date().toISOString(),
    };

    await supabase
      .from("encounter_medications")
      .update(updateData as never)
      .eq("id", med.id);

    fetchData();
  };

  const handleDeleteFile = async (file: EncounterFile) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    const updateData: EncounterFileUpdate = {
      deletedAt: new Date().toISOString(),
    };

    await supabase
      .from("encounter_files")
      .update(updateData as never)
      .eq("id", file.id);

    fetchData();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "active";
      case "DISCHARGED":
        return "discharged";
      case "DECEASED":
        return "deceased";
      default:
        return "default";
    }
  };

  const getFilesForAction = (actionId: string) => {
    return files.filter((f) => f.actionId === actionId);
  };

  const activeMeds = medications.filter((m) => m.status === "ACTIVE");
  const stoppedMeds = medications.filter((m) => m.status === "STOPPED");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!encounter || !patient) {
    return (
      <EmptyState
        icon={Activity}
        title="Encounter not found"
        description="The encounter you're looking for doesn't exist."
        action={
          <Button onClick={() => router.push("/patients")}>
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </Button>
        }
      />
    );
  }

  const isActive = encounter.status === "ACTIVE";

  // Calculate patient age
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

  return (
    <div className="space-y-3 md:space-y-4 lg:space-y-6 pb-20 md:pb-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
        {/* Left side - Patient info */}
        <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/patients/${patient.id}`)}
            className="flex-shrink-0 -ml-2 touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline text-xs md:text-sm">Back</span>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-surface-900 truncate">
                {patient.fullName}
              </h1>
              <Badge variant={getStatusVariant(encounter.status)} className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
                {encounter.status}
              </Badge>
            </div>
            
            {/* Patient Demographics */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 lg:gap-3 text-[10px] md:text-xs lg:text-sm text-surface-600 mb-1.5 md:mb-2">
              <span className="flex items-center gap-0.5 md:gap-1 font-medium">
                <User className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                {calculateAge(patient.birthDate)}y • {patient.sex || 'U'}
              </span>
              <span className="text-surface-300">•</span>
              <span className="text-surface-500 truncate max-w-[100px] sm:max-w-none">{patient.mrn || 'No MRN'}</span>
              <span className="text-surface-300">•</span>
              {isEditingWeight ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveWeight();
                      if (e.key === 'Escape') setIsEditingWeight(false);
                    }}
                    placeholder="kg"
                    className="w-14 md:w-16 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs border border-primary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveWeight}
                    disabled={isSavingWeight}
                    className="text-green-600 hover:text-green-700 touch-manipulation p-0.5"
                  >
                    <Save className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingWeight(false)}
                    className="text-surface-400 hover:text-surface-600 touch-manipulation p-0.5"
                  >
                    <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setWeightInput(patientDetails?.weight?.toString() || "");
                    setIsEditingWeight(true);
                  }}
                  className="flex items-center gap-0.5 md:gap-1 hover:text-primary-600 transition-colors touch-manipulation"
                >
                  <span className="font-medium">
                    {patientDetails?.weight ? `${patientDetails.weight}kg` : 'Add weight'}
                  </span>
                  <Edit2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                </button>
              )}
            </div>
            
            {/* Encounter Info */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 lg:gap-4 text-[10px] md:text-xs lg:text-sm text-surface-500">
              <span className="flex items-center gap-0.5 md:gap-1">
                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">{formatDateTime(encounter.startAt)}</span>
                <span className="sm:hidden">{formatDateTime(encounter.startAt).split(' ')[1]}</span>
              </span>
              {encounter.currentLocation && (
                <>
                  <span className="text-surface-300">•</span>
                  <span className="flex items-center gap-0.5 md:gap-1">
                    <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                    <span className="truncate max-w-[80px] sm:max-w-none">{encounter.currentLocation}</span>
                  </span>
                </>
              )}
              {encounter.createdBy && (
                <>
                  <span className="text-surface-300 hidden sm:inline">•</span>
                  <span className="hidden sm:flex items-center gap-0.5 md:gap-1 text-primary-600">
                    <Users className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                    <span className="truncate max-w-[100px] md:max-w-none">Created by {getUserName(encounter.createdBy)}</span>
                  </span>
                </>
              )}
              
              {/* Last Vitals Display */}
              {lastVitals && (
                <>
                  <span className="text-surface-400 hidden sm:inline">|</span>
                  <div className="flex items-center gap-0.5 md:gap-1 w-full sm:w-auto mt-1.5 sm:mt-0">
                    <button
                      onClick={() => setShowVitalsTrends(!showVitalsTrends)}
                      className="flex items-center gap-1 md:gap-1.5 hover:text-primary-600 transition-colors px-1.5 md:px-2 py-0.5 md:py-1 rounded-md hover:bg-primary-50 touch-manipulation"
                    >
                      <Activity className="w-3 h-3 md:w-4 md:h-4 text-red-500 flex-shrink-0" />
                      <span className="font-medium text-[10px] md:text-xs lg:text-sm text-surface-700 truncate">{lastVitals.text}</span>
                      <span className="text-[9px] md:text-[10px] text-surface-400 flex-shrink-0 hidden sm:inline">
                        ({formatRelativeTime(lastVitals.eventAt)})
                      </span>
                      <ChevronDown className={`w-2.5 h-2.5 md:w-3 md:h-3 transition-transform flex-shrink-0 ${showVitalsTrends ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        if (!isActive) return;
                        // Parse existing vitals to pre-fill form
                        const text = lastVitals.text || "";
                        const bpMatch = text.match(/BP:\s*([^\s|]+)/);
                        const hrMatch = text.match(/HR:\s*([^\s|]+)/);
                        const rrMatch = text.match(/RR:\s*([^\s|]+)/);
                        const tempMatch = text.match(/Temp:\s*([^\s|]+)/);
                        const spo2Match = text.match(/SpO2:\s*([^\s|]+)/);
                        
                        setVitalsInput({
                          bp: bpMatch ? bpMatch[1].replace(/mmHg/, '').trim() : "",
                          hr: hrMatch ? hrMatch[1].replace(/bpm/, '').trim() : "",
                          rr: rrMatch ? rrMatch[1].replace(/\/min/, '').trim() : "",
                          temp: tempMatch ? tempMatch[1].replace(/°C/, '').trim() : "",
                          spo2: spo2Match ? spo2Match[1].replace(/%/, '').trim() : "",
                        });
                        setIsEditingVitals(true);
                        setShowVitalsTrends(false);
                      }}
                      disabled={!isActive}
                      className={`p-1 rounded transition-colors ${
                        isActive 
                          ? "hover:bg-surface-100 cursor-pointer" 
                          : "opacity-50 cursor-not-allowed"
                      }`}
                      title={isActive ? "Edit vitals" : "Cannot edit vitals - encounter is closed"}
                    >
                      <Edit2 className={`w-3 h-3 ${isActive ? "text-surface-500" : "text-surface-400"}`} />
                    </button>
                  </div>
                </>
              )}
              
              {/* Add Vitals Button (if no vitals yet) */}
              {!lastVitals && (
                <>
                  <span className="text-surface-400">|</span>
                  <button
                    onClick={() => isActive && setIsEditingVitals(true)}
                    disabled={!isActive}
                    className={`flex items-center gap-1 font-medium ${
                      isActive 
                        ? "text-primary-600 hover:text-primary-700 cursor-pointer" 
                        : "text-surface-400 cursor-not-allowed"
                    }`}
                    title={isActive ? "Add vitals" : "Cannot edit vitals - encounter is closed"}
                  >
                    <Activity className="w-3 h-3 md:w-4 md:h-4" />
                    Add Vitals
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Action buttons - Compact on all screens */}
        <div className="flex items-center gap-2 justify-end">
          {/* Export buttons - always visible */}
          <EncounterExport 
            encounter={encounter} 
            patient={patient}
            patientDetails={patientDetails}
            actions={actions}
            files={files}
          />
          
          {/* Status change buttons - only for active encounters */}
          {isActive && (
            <>
              {/* Discharge button - icon only, compact on all screens */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStatusAction("discharge");
                  setIsStatusModalOpen(true);
                }}
                className="px-2"
                title="Discharge patient"
              >
                <LogOut className="w-4 h-4" />
              </Button>
              
              {/* Deceased button - icon only, compact on all screens */}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setStatusAction("deceased");
                  setIsStatusModalOpen(true);
                }}
                className="px-2"
                title="Mark as deceased"
              >
                <Skull className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Vitals Editor */}
      {isEditingVitals && isActive && (
        <div className="p-3 md:p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-lg dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Activity className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
              <h3 className="font-semibold text-sm md:text-base text-red-900">Record Vital Signs</h3>
            </div>
            <button
              onClick={() => setIsEditingVitals(false)}
              className="text-surface-400 hover:text-surface-600"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3">
            <div>
              <label className="block text-[10px] md:text-xs font-medium text-surface-700 mb-0.5 md:mb-1">
                BP (mmHg)
              </label>
              <input
                type="text"
                value={vitalsInput.bp}
                onChange={(e) => setVitalsInput({ ...vitalsInput, bp: e.target.value })}
                placeholder="120/80"
                className="w-full px-1.5 md:px-2 py-1 md:py-1.5 text-xs md:text-sm border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-medium text-surface-700 mb-0.5 md:mb-1">
                HR (bpm)
              </label>
              <input
                type="text"
                value={vitalsInput.hr}
                onChange={(e) => setVitalsInput({ ...vitalsInput, hr: e.target.value })}
                placeholder="75"
                className="w-full px-1.5 md:px-2 py-1 md:py-1.5 text-xs md:text-sm border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-medium text-surface-700 mb-0.5 md:mb-1">
                RR (/min)
              </label>
              <input
                type="text"
                value={vitalsInput.rr}
                onChange={(e) => setVitalsInput({ ...vitalsInput, rr: e.target.value })}
                placeholder="16"
                className="w-full px-1.5 md:px-2 py-1 md:py-1.5 text-xs md:text-sm border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-medium text-surface-700 mb-0.5 md:mb-1">
                Temp (°C)
              </label>
              <input
                type="text"
                value={vitalsInput.temp}
                onChange={(e) => setVitalsInput({ ...vitalsInput, temp: e.target.value })}
                placeholder="37.0"
                className="w-full px-1.5 md:px-2 py-1 md:py-1.5 text-xs md:text-sm border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-medium text-surface-700 mb-0.5 md:mb-1">
                SpO2 (%)
              </label>
              <input
                type="text"
                value={vitalsInput.spo2}
                onChange={(e) => setVitalsInput({ ...vitalsInput, spo2: e.target.value })}
                placeholder="98"
                className="w-full px-1.5 md:px-2 py-1 md:py-1.5 text-xs md:text-sm border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-1.5 md:gap-2 mt-3 md:mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditingVitals(false)}
              className="text-xs md:text-sm px-2 md:px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveVitals}
              loading={isSavingVitals}
              className="bg-red-600 hover:bg-red-700 text-xs md:text-sm px-2 md:px-3"
            >
              Save Vitals
            </Button>
          </div>
        </div>
      )}

      {/* Vitals Trends Graph */}
      {showVitalsTrends && !isEditingVitals && (() => {
        // Extract all vitals from actions
        const vitalsData = actions
          .filter(a => a.type === "VITALS")
          .map(action => {
            const text = action.text || "";
            const bpMatch = text.match(/BP:\s*([^\s|]+)/);
            const hrMatch = text.match(/HR:\s*([^\s|]+)/);
            const rrMatch = text.match(/RR:\s*([^\s|]+)/);
            const tempMatch = text.match(/Temp:\s*([^\s|]+)/);
            const spo2Match = text.match(/SpO2:\s*([^\s|]+)/);
            
            return {
              time: action.eventAt,
              bp: bpMatch ? bpMatch[1].replace(/mmHg/, '').trim() : null,
              hr: hrMatch ? parseFloat(hrMatch[1].replace(/bpm/, '').trim()) : null,
              rr: rrMatch ? parseFloat(rrMatch[1].replace(/\/min/, '').trim()) : null,
              temp: tempMatch ? parseFloat(tempMatch[1].replace(/°C/, '').trim()) : null,
              spo2: spo2Match ? parseFloat(spo2Match[1].replace(/%/, '').trim()) : null,
            };
          })
          .reverse(); // Oldest first

        return (
          <div className="p-3 md:p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                <h3 className="font-semibold text-sm md:text-base text-red-900">Vitals Trends</h3>
                <span className="text-[10px] md:text-xs text-red-600">({vitalsData.length} recordings)</span>
              </div>
              <button
                onClick={() => setShowVitalsTrends(false)}
                className="text-surface-400 hover:text-surface-600 touch-manipulation p-1"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {vitalsData.length === 0 ? (
              <p className="text-xs md:text-sm text-surface-500 text-center py-6 md:py-8">No vitals recorded yet</p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {/* Timeline view of vitals */}
                <div className="space-y-2 md:space-y-3">
                  {vitalsData.map((vital, index) => (
                    <div key={index} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-white rounded-lg shadow-sm">
                      <div className="flex-shrink-0 w-14 md:w-20 text-[10px] md:text-xs text-surface-500">
                        <div className="font-medium">{formatDateTime(vital.time).split(' ')[1]}</div>
                        <div className="text-[9px] md:text-[10px]">{formatDateTime(vital.time).split(' ')[0]}</div>
                      </div>
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-1.5 md:gap-2 text-[10px] md:text-xs">
                        {vital.bp && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-blue-700">BP:</span>
                            <span>{vital.bp}</span>
                          </div>
                        )}
                        {vital.hr && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-red-700">HR:</span>
                            <span>{vital.hr} bpm</span>
                          </div>
                        )}
                        {vital.rr && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-purple-700">RR:</span>
                            <span>{vital.rr}/min</span>
                          </div>
                        )}
                        {vital.temp && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-orange-700">Temp:</span>
                            <span>{vital.temp}°C</span>
                          </div>
                        )}
                        {vital.spo2 && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-cyan-700">SpO2:</span>
                            <span>{vital.spo2}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Simple visual trend indicators */}
                {vitalsData.length > 1 && (
                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <h4 className="text-xs font-semibold text-surface-700 mb-2">Trend Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {(() => {
                        const latest = vitalsData[vitalsData.length - 1];
                        const previous = vitalsData[vitalsData.length - 2];
                        
                        const getTrend = (current: number | null, prev: number | null) => {
                          if (!current || !prev) return null;
                          const diff = current - prev;
                          if (Math.abs(diff) < 0.1) return { icon: "→", color: "text-surface-500", text: "stable" };
                          if (diff > 0) return { icon: "↑", color: "text-red-600", text: `+${diff.toFixed(1)}` };
                          return { icon: "↓", color: "text-blue-600", text: `${diff.toFixed(1)}` };
                        };

                        return (
                          <>
                            {latest.hr && previous.hr && (() => {
                              const trend = getTrend(latest.hr, previous.hr);
                              return trend && (
                                <div className={`flex items-center gap-1 ${trend.color}`}>
                                  <span className="font-semibold">HR:</span>
                                  <span>{trend.icon}</span>
                                  <span>{trend.text}</span>
                                </div>
                              );
                            })()}
                            {latest.rr && previous.rr && (() => {
                              const trend = getTrend(latest.rr, previous.rr);
                              return trend && (
                                <div className={`flex items-center gap-1 ${trend.color}`}>
                                  <span className="font-semibold">RR:</span>
                                  <span>{trend.icon}</span>
                                  <span>{trend.text}</span>
                                </div>
                              );
                            })()}
                            {latest.temp && previous.temp && (() => {
                              const trend = getTrend(latest.temp, previous.temp);
                              return trend && (
                                <div className={`flex items-center gap-1 ${trend.color}`}>
                                  <span className="font-semibold">Temp:</span>
                                  <span>{trend.icon}</span>
                                  <span>{trend.text}°C</span>
                                </div>
                              );
                            })()}
                            {latest.spo2 && previous.spo2 && (() => {
                              const trend = getTrend(latest.spo2, previous.spo2);
                              return trend && (
                                <div className={`flex items-center gap-1 ${trend.color}`}>
                                  <span className="font-semibold">SpO2:</span>
                                  <span>{trend.icon}</span>
                                  <span>{trend.text}%</span>
                                </div>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Warning for non-active encounters */}
      {!isActive && (
        <div className="flex items-center gap-3 p-3 md:p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-600 flex-shrink-0 dark:text-amber-400" />
          <p className="text-xs md:text-sm text-amber-800 dark:text-amber-200">
            This encounter is {encounter.status.toLowerCase()}. Some actions may be limited.
          </p>
        </div>
      )}

      {/* Discharge Note Display */}
      {encounter.status === "DISCHARGED" && encounter.dischargeNote && (
        <Card className="shadow-md border-2 border-blue-300">
          <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900">
                <FileText className="w-6 h-6 text-blue-600" />
                Discharge Summary
              </h2>
              {encounter.dischargeAt && (
                <span className="text-sm text-blue-700 font-medium">
                  {formatDateTime(encounter.dischargeAt)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="p-6 bg-white rounded-lg border-2 border-blue-200">
              <div className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap font-sans">
                {encounter.dischargeNote}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Diagnosis & Problems - Full Width Top Section - Collapsible */}
      <Card className="shadow-sm border-2 border-primary-100">
        <CardHeader className="bg-gradient-to-r from-primary-50 to-white p-3 md:p-4">
          <button 
            onClick={() => toggleCard('diagnosis')}
            className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <h2 className="section-title text-sm md:text-base">
              <ListChecks className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
              Diagnosis & Problems
              {(dxForm.primaryDx || dxForm.problemListText) && (
                <span className="text-xs text-primary-600 ml-2">●</span>
              )}
            </h2>
            <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-surface-500 transition-transform ${expandedCards.diagnosis ? 'rotate-180' : ''}`} />
          </button>
        </CardHeader>
        {expandedCards.diagnosis && (
          <CardBody className="p-3 md:p-4">
            <form onSubmit={handleSaveDx} className="space-y-3 md:space-y-5">
              {/* Primary Diagnosis */}
              <div className="p-3 md:p-4 bg-red-50 rounded-lg border border-red-200">
                <label className="block text-xs md:text-sm font-semibold text-red-900 mb-2">
                  Primary / Final Diagnosis
                </label>
                <Textarea
                  value={dxForm.primaryDx}
                  onChange={(e) =>
                    setDxForm({ ...dxForm, primaryDx: e.target.value })
                  }
                  rows={3}
                  placeholder="e.g., Community-Acquired Pneumonia, Sepsis secondary to CAP"
                  className="bg-white text-sm"
                />
              </div>

              {/* Problem List */}
              <div className="p-3 md:p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs md:text-sm font-semibold text-amber-900">
                    Problem List
                  </label>
                  <span className="text-[10px] md:text-xs text-amber-600">One per line</span>
                </div>
                <Textarea
                  value={dxForm.problemListText}
                  onChange={(e) =>
                    setDxForm({ ...dxForm, problemListText: e.target.value })
                  }
                  rows={5}
                  placeholder="Sepsis&#10;AKI Stage 2&#10;DM2 uncontrolled&#10;Hypertension"
                  className="bg-white font-mono text-xs md:text-sm"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" loading={isSavingDx}>
                  <Save className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">Save</span>
                </Button>
              </div>
            </form>
          </CardBody>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Clinical Notes & Timeline */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Clinical Documentation - Collapsible */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white p-3 md:p-4">
              <button 
                onClick={() => toggleCard('clinical')}
                className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
              >
                <h2 className="section-title text-sm md:text-base">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  Clinical Documentation
                  {(notesForm.cc || notesForm.hpi || notesForm.ros || notesForm.physicalExam || notesForm.investigations || notesForm.summary) && (
                    <span className="text-xs text-blue-600 ml-2">●</span>
                  )}
                </h2>
                <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-surface-500 transition-transform ${expandedCards.clinical ? 'rotate-180' : ''}`} />
              </button>
            </CardHeader>
            {expandedCards.clinical && (
              <CardBody className="space-y-3 md:space-y-4 p-3 md:p-4">
              <form onSubmit={handleSaveNotes} className="space-y-2 md:space-y-3">
                {/* History Section - Collapsible */}
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('history')}
                    className="w-full p-2.5 md:p-3 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-blue-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="w-1 h-4 md:h-5 bg-blue-500 rounded"></span>
                      <h3 className="text-xs md:text-sm font-semibold text-surface-700">History</h3>
                      {(notesForm.cc || notesForm.hpi || notesForm.ros) && (
                        <span className="text-xs text-blue-600">●</span>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-surface-500 transition-transform ${expandedSections.history ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.history && (
                    <div className="p-3 md:p-4 space-y-2.5 md:space-y-3 bg-surface-50">
                      <Textarea
                        label="Chief Complaint"
                        value={notesForm.cc}
                        onChange={(e) =>
                          setNotesForm({ ...notesForm, cc: e.target.value })
                        }
                        rows={2}
                        placeholder="Patient presents with..."
                        className="text-sm"
                      />
                      <Textarea
                        label="History of Present Illness"
                        value={notesForm.hpi}
                        onChange={(e) =>
                          setNotesForm({ ...notesForm, hpi: e.target.value })
                        }
                        rows={4}
                        placeholder="Detailed history..."
                        className="text-sm"
                      />
                      <Textarea
                        label="Review of Systems"
                        value={notesForm.ros}
                        onChange={(e) =>
                          setNotesForm({ ...notesForm, ros: e.target.value })
                        }
                        rows={3}
                        placeholder="Constitutional, HEENT, CV, Resp..."
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Examination Section - Collapsible */}
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('examination')}
                    className="w-full p-2.5 md:p-3 bg-gradient-to-r from-green-50 to-white hover:from-green-100 hover:to-green-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="w-1 h-4 md:h-5 bg-green-500 rounded"></span>
                      <h3 className="text-xs md:text-sm font-semibold text-surface-700">Examination</h3>
                      {notesForm.physicalExam && (
                        <span className="text-xs text-green-600">●</span>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-surface-500 transition-transform ${expandedSections.examination ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.examination && (
                    <div className="p-3 md:p-4 space-y-2.5 md:space-y-3 bg-green-50">
                      <Textarea
                        label="Physical Examination"
                        value={notesForm.physicalExam}
                        onChange={(e) =>
                          setNotesForm({ ...notesForm, physicalExam: e.target.value })
                        }
                        rows={4}
                        placeholder="General: Alert, oriented&#10;HEENT: Normal&#10;CV: RRR, no murmurs&#10;Resp: Clear bilateral..."
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Investigations Section - Collapsible */}
                <div className="border border-purple-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('investigations')}
                    className="w-full p-2.5 md:p-3 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-purple-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="w-1 h-4 md:h-5 bg-purple-500 rounded"></span>
                      <h3 className="text-xs md:text-sm font-semibold text-surface-700">Investigations & Images</h3>
                      {(notesForm.investigations || files.filter(f => !f.actionId).length > 0) && (
                        <span className="text-xs text-purple-600">●</span>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-surface-500 transition-transform ${expandedSections.investigations ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.investigations && (
                    <div className="p-3 md:p-4 space-y-2.5 md:space-y-3 bg-purple-50">
                      <Textarea
                        label="Lab Results & Imaging"
                        value={notesForm.investigations}
                        onChange={(e) =>
                          setNotesForm({ ...notesForm, investigations: e.target.value })
                        }
                        rows={3}
                        placeholder="Lab results, imaging findings, etc..."
                      />
                  
                  {/* Investigation Images */}
                  {files.filter(f => !f.actionId).length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] md:text-xs font-medium text-surface-600 mb-1.5 md:mb-2">Attached Images:</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {files.filter(f => !f.actionId).map((file) => (
                          <div key={file.id} className="relative group">
                            {file.fileType.startsWith("image/") ? (
                              <>
                                <img
                                  src={file.fileUrl}
                                  alt={file.fileName}
                                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-purple-500 shadow-sm"
                                  onClick={() => setViewingFile(file)}
                                  loading="lazy"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file);
                                  }}
                                  className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                >
                                  <X className="w-2 h-2 md:w-3 md:h-3" />
                                </button>
                              </>
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-100 rounded-lg flex items-center justify-center">
                                <Paperclip className="w-3 h-3 md:w-4 md:h-4 text-surface-500" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                      {/* Upload Buttons for Investigations */}
                      <div className="flex gap-2">
                        {/* Camera input for investigations */}
                        <input
                          ref={investigationCameraRef}
                          type="file"
                          multiple
                          accept="image/*"
                          capture="environment"
                          onChange={async (e) => {
                            const selectedFiles = Array.from(e.target.files || []);
                            for (const file of selectedFiles) {
                              try {
                                let processedFile = file;
                                if (file.size > MAX_FILE_SIZE && file.type.startsWith("image/")) {
                                  processedFile = await compressImage(file);
                                } else if (file.type.startsWith("image/")) {
                                  processedFile = await compressImage(file);
                                }
                                
                                // Upload immediately to investigations (no actionId)
                                const fileExt = processedFile.name.split(".").pop();
                                const fileName = `${encounterId}/inv-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                                
                                const { data, error } = await supabase.storage
                                  .from("encounter-files")
                                  .upload(fileName, processedFile);
                                
                                if (!error && data) {
                                  const { data: urlData } = supabase.storage
                                    .from("encounter-files")
                                    .getPublicUrl(data.path);
                                  
                                  const fileInsert: EncounterFileInsert = {
                                    encounterId,
                                    actionId: null,
                                    fileName: processedFile.name,
                                    fileType: processedFile.type,
                                    fileUrl: urlData.publicUrl,
                                    fileSize: processedFile.size,
                                  };
                                  
                                  await supabase.from("encounter_files").insert(fileInsert as never);
                                  fetchData();
                                }
                              } catch (error) {
                                console.error("Error uploading investigation file:", error);
                              }
                            }
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                        {/* Gallery input for investigations */}
                        <input
                          ref={investigationGalleryRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={async (e) => {
                            const selectedFiles = Array.from(e.target.files || []);
                            for (const file of selectedFiles) {
                              try {
                                let processedFile = file;
                                if (file.size > MAX_FILE_SIZE && file.type.startsWith("image/")) {
                                  processedFile = await compressImage(file);
                                } else if (file.type.startsWith("image/")) {
                                  processedFile = await compressImage(file);
                                }
                                
                                // Upload immediately to investigations (no actionId)
                                const fileExt = processedFile.name.split(".").pop();
                                const fileName = `${encounterId}/inv-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                                
                                const { data, error } = await supabase.storage
                                  .from("encounter-files")
                                  .upload(fileName, processedFile);
                                
                                if (!error && data) {
                                  const { data: urlData } = supabase.storage
                                    .from("encounter-files")
                                    .getPublicUrl(data.path);
                                  
                                  const fileInsert: EncounterFileInsert = {
                                    encounterId,
                                    actionId: null,
                                    fileName: processedFile.name,
                                    fileType: processedFile.type,
                                    fileUrl: urlData.publicUrl,
                                    fileSize: processedFile.size,
                                  };
                                  
                                  await supabase.from("encounter_files").insert(fileInsert as never);
                                  fetchData();
                                }
                              } catch (error) {
                                console.error("Error uploading investigation file:", error);
                              }
                            }
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => investigationCameraRef.current?.click()}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          <span className="hidden sm:inline">Take Photo</span>
                          <span className="sm:hidden">Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => investigationGalleryRef.current?.click()}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">From Gallery</span>
                          <span className="sm:hidden">Gallery</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assessment & Plan Section - Collapsible */}
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('plan')}
                    className="w-full p-2.5 md:p-3 bg-gradient-to-r from-amber-50 to-white hover:from-amber-100 hover:to-amber-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="w-1 h-4 md:h-5 bg-amber-500 rounded"></span>
                      <h3 className="text-xs md:text-sm font-semibold text-surface-700">Assessment & Plan</h3>
                      {notesForm.summary && (
                        <span className="text-xs text-amber-600">●</span>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-surface-500 transition-transform ${expandedSections.plan ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.plan && (
                    <div className="p-3 md:p-4 space-y-2.5 md:space-y-3 bg-amber-50">
                      <Textarea
                        label="Summary / Plan"
                        value={notesForm.summary}
                        onChange={(e) =>
                          setNotesForm({ ...notesForm, summary: e.target.value })
                        }
                        rows={4}
                        className="text-sm"
                        placeholder="Linked statement and plan..."
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 md:pt-3">
                  <Button type="submit" size="sm" loading={isSavingNotes} className="shadow-sm text-xs md:text-sm px-3 md:px-4">
                    <Save className="w-3 h-3 md:w-4 md:h-4" />
                    Save All Notes
                  </Button>
                </div>
              </form>
            </CardBody>
            )}
          </Card>

          {/* Timeline - Now Below Clinical Notes - Collapsible */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-white p-3 md:p-4">
              <button 
                onClick={() => toggleCard('timeline')}
                className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
              >
                <h2 className="section-title text-sm md:text-base">
                  <Stethoscope className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                  Timeline
                  {actions.length > 0 && (
                    <span className="text-xs text-surface-500 ml-2">({actions.length})</span>
                  )}
                </h2>
                <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-surface-500 transition-transform ${expandedCards.timeline ? 'rotate-180' : ''}`} />
              </button>
            </CardHeader>
            {expandedCards.timeline && (
              <CardBody className="p-3 md:p-4">
              {/* Add Action Form - Redesigned */}
              <form onSubmit={handleAddAction} className="mb-4 md:mb-6">
                <div className="border border-surface-200 rounded-lg md:rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                  {/* Type selector and options row */}
                  <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-surface-50 border-b border-surface-200 flex-wrap">
                    <Select
                      value={actionForm.type}
                      onChange={(e) => {
                        const selectedType = e.target.value;
                        if (selectedType === "VITALS") {
                          // Open vitals editor in header instead
                          setIsEditingVitals(true);
                          // Scroll to top to show vitals editor
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          setActionForm({ ...actionForm, type: selectedType, transferTo: "" });
                        }
                      }}
                      options={ACTION_TYPES}
                      className="!py-0.5 md:!py-1 !px-1.5 md:!px-2 !text-[10px] md:!text-xs !border-0 !bg-white !shadow-sm !rounded-md w-auto"
                    />
                    
                    {/* Time toggle button */}
                    <button
                      type="button"
                      onClick={() => setShowTimeInput(!showTimeInput)}
                      className={`flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded-md transition-colors ${
                        showTimeInput || actionForm.eventAt
                          ? "bg-primary-100 text-primary-700"
                          : "bg-white text-surface-600 hover:bg-surface-100"
                      }`}
                    >
                      <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden sm:inline">{actionForm.eventAt ? "Custom time" : "Now"}</span>
                      <ChevronDown className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </button>

                    {/* File upload buttons */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded-md bg-white text-surface-600 hover:bg-surface-100 transition-colors"
                      title="Take photo with camera"
                    >
                      <Camera className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden sm:inline">Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded-md bg-white text-surface-600 hover:bg-surface-100 transition-colors"
                      title="Select from gallery. Max 200KB per file."
                    >
                      <Paperclip className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden sm:inline">Files</span>
                    </button>
                    {/* Camera input - opens camera directly */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {/* Gallery/file picker input - opens file picker */}
                    <input
                      ref={galleryInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {/* Legacy ref for backward compatibility */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Time input - collapsible */}
                  {showTimeInput && (
                    <div className="px-2 md:px-3 py-1.5 md:py-2 bg-surface-50 border-b border-surface-200">
                      <Input
                        type="datetime-local"
                        value={actionForm.eventAt}
                        onChange={(e) =>
                          setActionForm({ ...actionForm, eventAt: e.target.value })
                        }
                        className="!text-xs md:!text-sm max-w-xs"
                      />
                    </div>
                  )}

                  {/* Main text area or transfer input */}
                  {actionForm.type === "TRANSFER" ? (
                    <div className="p-2 md:p-3">
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-surface-600 mb-1.5 md:mb-2">
                        <ArrowRightLeft className="w-3 h-3 md:w-4 md:h-4" />
                        <span>From: {encounter.currentLocation || "Unknown"}</span>
                      </div>
                      <Input
                        value={actionForm.transferTo}
                        onChange={(e) =>
                          setActionForm({ ...actionForm, transferTo: e.target.value })
                        }
                        placeholder="Transfer to (e.g., ICU, Ward A, OR)..."
                        className="!border-0 !p-0 !text-sm md:!text-base !shadow-none focus:!ring-0"
                      />
                    </div>
                  ) : (
                    <Textarea
                      value={actionForm.text}
                      onChange={(e) =>
                        setActionForm({ ...actionForm, text: e.target.value })
                      }
                      placeholder={
                        editingAction
                          ? "Edit action..."
                          : "Add a note, treatment, investigation, exam finding..."
                      }
                      rows={3}
                      className="!border-0 !rounded-none !text-sm md:!text-base focus:!ring-0 resize-none"
                    />
                  )}

                  {/* Pending files preview */}
                  {pendingFiles.length > 0 && (
                    <div className="px-2 md:px-3 py-1.5 md:py-2 border-t border-surface-200 bg-surface-50">
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {pendingFiles.map((file, index) => (
                          <div
                            key={index}
                            className="relative group"
                          >
                            {file.type.startsWith("image/") ? (
                              <div className="relative">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePendingFile(index)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 rounded-b-lg">
                                  <span className="text-[9px] text-white">
                                    {(file.size / 1024).toFixed(0)}KB
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-md text-xs">
                                <Paperclip className="w-3 h-3 text-surface-500" />
                                <div className="flex flex-col">
                                  <span className="truncate max-w-[100px]">{file.name}</span>
                                  <span className="text-[10px] text-surface-400">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePendingFile(index)}
                                  className="text-surface-400 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between px-2 md:px-3 py-1.5 md:py-2 bg-surface-50 border-t border-surface-200">
                    {editingAction ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAction(null);
                          setActionForm({ type: "NOTE", text: "", eventAt: "", transferTo: "" });
                          setShowTimeInput(false);
                        }}
                        className="text-xs md:text-sm px-2 md:px-3"
                      >
                        Cancel Edit
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      loading={isAddingAction}
                      disabled={
                        actionForm.type === "TRANSFER"
                          ? !actionForm.transferTo.trim()
                          : !actionForm.text.trim() && pendingFiles.length === 0
                      }
                      className="text-xs md:text-sm px-2 md:px-3"
                    >
                      <Send className="w-3 h-3 md:w-4 md:h-4" />
                      {editingAction ? "Update" : "Add"}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Actions List */}
              {actions.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <Activity className="w-10 h-10 md:w-12 md:h-12 text-surface-200 mx-auto mb-2 md:mb-3" />
                  <p className="text-sm md:text-base text-surface-500">No timeline entries yet</p>
                  <p className="text-xs text-surface-400 mt-1">Add your first action above</p>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {actions.map((action) => {
                    const actionFiles = getFilesForAction(action.id);
                    console.log(`Action ${action.id} files:`, actionFiles);
                    return (
                      <div
                        key={action.id}
                        className="p-2.5 md:p-3 lg:p-4 rounded-lg md:rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors group border border-transparent hover:border-surface-200"
                      >
                        <div className="flex items-start gap-2 md:gap-3">
                          <span
                            className={`badge text-[9px] md:text-[10px] flex-shrink-0 px-1.5 md:px-2 py-0.5 md:py-1 ${getActionTypeColor(
                              action.type
                            )}`}
                          >
                            {getActionTypeLabel(action.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm lg:text-base text-surface-900 whitespace-pre-wrap leading-relaxed">
                              {action.text}
                            </p>
                            
                            {/* Attached files */}
                            {actionFiles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-3">
                                {actionFiles.map((file) => (
                                  <button
                                    key={file.id}
                                    onClick={() => setViewingFile(file)}
                                    className="group relative overflow-hidden rounded-md md:rounded-lg hover:ring-2 hover:ring-primary-500 transition-all shadow-sm"
                                  >
                                    {file.fileType.startsWith("image/") ? (
                                      <div className="relative">
                                        <img
                                          src={file.fileUrl}
                                          alt={file.fileName}
                                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover"
                                          loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-0.5 md:p-1">
                                          <p className="text-[8px] md:text-[10px] text-white truncate px-0.5">
                                            {file.fileName}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-surface-100 flex flex-col items-center justify-center gap-0.5 md:gap-1 hover:bg-surface-200">
                                        <Paperclip className="w-4 h-4 md:w-6 md:h-6 text-surface-500" />
                                        <span className="text-[8px] md:text-[10px] text-surface-600 truncate max-w-[55px] md:max-w-[70px] px-1">
                                          {file.fileName}
                                        </span>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Enhanced metadata */}
                            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-2 md:mt-3 text-[10px] md:text-xs text-surface-500">
                              <span className="flex items-center gap-0.5 md:gap-1">
                                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                <span className="hidden sm:inline">{formatDateTime(action.eventAt)}</span>
                                <span className="sm:hidden">{formatDateTime(action.eventAt).split(' ')[1]}</span>
                              </span>
                              <span className="text-surface-300 hidden sm:inline">•</span>
                              <span className="font-medium text-primary-600 text-[9px] md:text-[10px]">
                                {formatRelativeTime(action.eventAt)}
                              </span>
                              {action.createdBy && (
                                <>
                                  <span className="text-surface-300">•</span>
                                  <span className="flex items-center gap-0.5 md:gap-1 text-surface-600">
                                    <User className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    <span className="hidden sm:inline">{getUserName(action.createdBy)}</span>
                                  </span>
                                </>
                              )}
                              {action.type === "TRANSFER" && (
                                <>
                                  <span className="text-surface-300 hidden sm:inline">•</span>
                                  <span className="flex items-center gap-0.5 md:gap-1 px-1 md:px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[8px] md:text-[10px] font-semibold">
                                    <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    <span className="hidden sm:inline">TRANSFER</span>
                                  </span>
                                </>
                              )}
                              {action.type === "VITALS" && (
                                <>
                                  <span className="text-surface-300 hidden sm:inline">•</span>
                                  <span className="flex items-center gap-0.5 md:gap-1 px-1 md:px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[8px] md:text-[10px] font-semibold">
                                    <Activity className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    <span className="hidden sm:inline">VITAL SIGNS</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-0.5 md:gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditAction(action)}
                              className="!p-1 md:!p-1.5 touch-manipulation"
                            >
                              <Edit2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAction(action)}
                              className="!p-1 md:!p-1.5 text-red-600 hover:text-red-700 touch-manipulation"
                            >
                              <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
            )}
          </Card>
        </div>

        {/* Right Column - Meds & Files */}
        <div className="space-y-4 md:space-y-6">
          {/* Medications - Collapsible */}
          <Card className="shadow-sm lg:sticky lg:top-4">
            <CardHeader className="bg-gradient-to-r from-pink-50 to-white p-3 md:p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleCard('medications')}
                  className="flex items-center gap-1.5 md:gap-2 flex-1 text-left min-w-0"
                >
                  <h2 className="section-title text-sm md:text-base">
                    <Pill className="w-4 h-4 md:w-5 md:h-5 text-pink-600" />
                    Medications
                    {medications.length > 0 && (
                      <span className="text-xs text-surface-500 ml-1 md:ml-2">({medications.length})</span>
                    )}
                  </h2>
                  <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-surface-500 transition-transform flex-shrink-0 ${expandedCards.medications ? 'rotate-180' : ''}`} />
                </button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingMed(null);
                    setMedForm({
                      name: "",
                      dose: "",
                      route: "",
                      frequency: "",
                      indication: "",
                      notes: "",
                    });
                    setIsMedModalOpen(true);
                  }}
                  disabled={!isActive}
                  className="px-2 md:px-3"
                >
                  <Plus className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline text-xs md:text-sm">Add</span>
                </Button>
              </div>
            </CardHeader>
            {expandedCards.medications && (
              <CardBody className="p-0">
              {/* Active Meds */}
              {activeMeds.length > 0 && (
                <div className="p-2.5 md:p-3 lg:p-4 border-b border-surface-100">
                  <h3 className="text-[10px] md:text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 md:mb-3">
                    Active ({activeMeds.length})
                  </h3>
                  <div className="space-y-1.5 md:space-y-2">
                    {activeMeds.map((med, idx) => {
                      const colors = [
                        'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200',
                        'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200',
                        'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200',
                        'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200',
                        'bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200',
                      ];
                      const colorClass = colors[idx % colors.length];
                      
                      return (
                        <div
                          key={med.id}
                          className={`flex items-center justify-between p-2 md:p-2.5 lg:p-3 rounded-lg ${colorClass} group hover:shadow-md transition-all`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <Pill className="w-3 h-3 md:w-4 md:h-4 text-primary-600 flex-shrink-0" />
                              <p className="font-semibold text-xs md:text-sm text-surface-900">
                                {med.name}
                              </p>
                            </div>
                            <p className="text-[10px] md:text-xs text-surface-700 mt-0.5 md:mt-1 ml-4 md:ml-6 font-medium">
                              {[med.dose, med.route, med.frequency]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                            {med.indication && (
                              <p className="text-[10px] md:text-xs text-surface-600 mt-0.5 md:mt-1 ml-4 md:ml-6 leading-snug">
                                <span className="text-primary-500">➜</span> {med.indication}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingMed(med);
                                setMedForm({
                                  name: med.name,
                                  dose: med.dose || "",
                                  route: med.route || "",
                                  frequency: med.frequency || "",
                                  indication: med.indication || "",
                                  notes: med.notes || "",
                                });
                                setIsMedModalOpen(true);
                              }}
                              disabled={!isActive}
                              className="!p-1 md:!p-1.5 text-blue-600 touch-manipulation"
                            >
                              <Edit2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStopMedication(med)}
                              disabled={!isActive}
                              className="!p-1 md:!p-1.5 text-amber-600 touch-manipulation"
                            >
                              <Square className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMedication(med)}
                              className="!p-1 md:!p-1.5 text-red-600 touch-manipulation"
                            >
                              <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stopped Meds */}
              {stoppedMeds.length > 0 && (
                <div className="p-2.5 md:p-3 lg:p-4">
                  <h3 className="text-[10px] md:text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 md:mb-3">
                    Stopped ({stoppedMeds.length})
                  </h3>
                  <div className="space-y-1.5 md:space-y-2">
                    {stoppedMeds.map((med) => (
                      <div
                        key={med.id}
                        className="flex items-center justify-between p-1.5 md:p-2 rounded-lg bg-surface-50 group border border-surface-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs md:text-sm text-surface-500 line-through">
                            {med.name}
                          </p>
                          <p className="text-[9px] md:text-xs text-surface-400 mt-0.5">
                            {formatDateTime(med.startAt).split(' ')[1]} → {formatDateTime(med.stopAt).split(' ')[1]}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMedication(med)}
                          className="!p-1 md:!p-1.5 text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {medications.length === 0 && (
                <div className="p-5 md:p-6 text-center">
                  <Play className="w-7 h-7 md:w-8 md:h-8 text-surface-300 mx-auto mb-2" />
                  <p className="text-surface-500 text-xs md:text-sm">No medications yet</p>
                  <p className="text-surface-400 text-[10px] md:text-xs mt-1">Click Add to start prescribing</p>
                </div>
              )}
            </CardBody>
            )}
          </Card>

          {/* Files Gallery - Collapsible */}
          {files.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-white">
                <button 
                  onClick={() => toggleCard('files')}
                  className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <h2 className="section-title">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                    All Files ({files.length})
                  </h2>
                  <ChevronDown className={`w-5 h-5 text-surface-500 transition-transform ${expandedCards.files ? 'rotate-180' : ''}`} />
                </button>
              </CardHeader>
              {expandedCards.files && (
                <CardBody>
                <div className="grid grid-cols-3 gap-2">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setViewingFile(file)}
                      className="aspect-square rounded-lg overflow-hidden bg-surface-100 hover:ring-2 hover:ring-primary-500 transition-all group relative"
                    >
                      {file.fileType.startsWith("image/") ? (
                        <>
                          <img
                            src={file.fileUrl}
                            alt={file.fileName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <Paperclip className="w-6 h-6 text-surface-400" />
                          <span className="text-[9px] text-surface-500 px-1 text-center line-clamp-2">
                            {file.fileName}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardBody>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setStatusAction(null);
          setDischargeNote("");
        }}
        title={
          statusAction === "discharge"
            ? "Discharge Patient"
            : "Mark Patient as Deceased"
        }
        size="md"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            {statusAction === "discharge"
              ? "Please provide discharge information. This will end the encounter."
              : "Are you sure you want to mark this patient as deceased? This will end the encounter."}
          </p>

          {statusAction === "discharge" && (
            <div>
              <Textarea
                label="Discharge Note"
                value={dischargeNote}
                onChange={(e) => setDischargeNote(e.target.value)}
                rows={6}
                placeholder="Discharge summary, final diagnosis, medications on discharge, follow-up instructions..."
              />
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                Include discharge diagnosis, medications, and follow-up plan
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsStatusModalOpen(false);
                setStatusAction(null);
                setDischargeNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={statusAction === "deceased" ? "danger" : "primary"}
              className="w-full sm:w-auto"
              onClick={handleStatusChange}
              loading={isProcessingStatus}
            >
              {statusAction === "discharge" ? "Discharge" : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Medication Modal */}
      <Modal
        isOpen={isMedModalOpen}
        onClose={() => {
          setIsMedModalOpen(false);
          setEditingMed(null);
        }}
        title={editingMed ? "Edit Medication" : "Add Medication"}
      >
        <form onSubmit={handleAddMedication} className="space-y-4">
          <Input
            label="Medication Name"
            value={medForm.name}
            onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
            required
            placeholder="e.g., Ceftriaxone"
          />
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <Input
                label="Dose"
                value={medForm.dose}
                onChange={(e) => handleDoseChange(e.target.value)}
                placeholder={patientDetails?.weight ? "10 mg/kg" : "1 g"}
              />
              <Input
                label="Route"
                value={medForm.route}
                onChange={(e) => setMedForm({ ...medForm, route: e.target.value })}
                placeholder="IV"
              />
              <Input
                label="Frequency"
                value={medForm.frequency}
                onChange={(e) =>
                  setMedForm({ ...medForm, frequency: e.target.value })
                }
                placeholder="q8h"
              />
            </div>
            
            {/* Auto-calculation hint */}
            {patientDetails?.weight && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded">
                <Activity className="w-3 h-3" />
                <span>
                  Weight: <strong>{patientDetails.weight}kg</strong> • 
                  Type "10 mg/kg" or "0.5 units/kg" for auto-calculation
                </span>
              </div>
            )}
          </div>

          <Input
            label="Indication"
            value={medForm.indication}
            onChange={(e) =>
              setMedForm({ ...medForm, indication: e.target.value })
            }
            placeholder="CAP"
          />
          <Textarea
            label="Notes"
            value={medForm.notes}
            onChange={(e) => setMedForm({ ...medForm, notes: e.target.value })}
            rows={2}
            placeholder="Additional notes..."
          />

          {/* Drug Dosing Cheat Sheet */}
          <div className="border border-indigo-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              className="w-full p-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-900">
                  Quick Dosing Reference {patientDetails?.weight ? `(${patientDetails.weight}kg)` : '(assumed 70kg)'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform ${showCheatSheet ? 'rotate-180' : ''}`} />
            </button>
            
            {showCheatSheet && (() => {
              // Get weight for calculations (use actual weight or default to 70kg)
              const calcWeight = patientDetails?.weight ? parseFloat(patientDetails.weight) : 70;
              const isAssumed = !patientDetails?.weight;
              
              // Helper function to calculate dose range
              const calcDose = (dosePerKgMin: number, dosePerKgMax?: number, unit: string = 'mg') => {
                const min = dosePerKgMin * calcWeight;
                const max = dosePerKgMax ? dosePerKgMax * calcWeight : null;
                
                const formatDose = (val: number) => {
                  return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '');
                };
                
                if (max) {
                  return `${formatDose(min)}-${formatDose(max)} ${unit}`;
                } else {
                  return `${formatDose(min)} ${unit}`;
                }
              };
              
              return (
              <div className="p-3 bg-white max-h-72 overflow-y-auto text-xs">
                {/* Weight Display */}
                <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded border border-purple-200">
                  <span className="text-xs font-semibold text-purple-900">
                    Calculations for: <strong>{calcWeight}kg</strong> {isAssumed && <span className="text-purple-600">(assumed)</span>}
                  </span>
                </div>
                
                {/* GFR Calculator */}
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-1 text-xs">
                    🧮 GFR Calculator (Cockcroft-Gault)
                  </h4>
                  <div className="space-y-2">
                    {/* Patient Info Display */}
                    <div className="flex flex-wrap gap-3 text-xs text-surface-600">
                      <span>Age: <strong>{patient?.birthDate ? calculateAge(patient.birthDate) : '?'} years</strong></span>
                      <span>Weight: <strong>{patientDetails?.weight ? `${patientDetails.weight}kg` : '?'}</strong></span>
                      <span>Sex: <strong>{patient?.sex === 'M' ? 'Male' : patient?.sex === 'F' ? 'Female' : '?'}</strong></span>
                    </div>
                    
                    {/* Creatinine Input */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-surface-700 min-w-[60px]">
                        Creatinine:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={creatinine}
                        onChange={(e) => setCreatinine(e.target.value)}
                        placeholder="e.g., 1.2"
                        className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs text-surface-500 min-w-[40px]">mg/dL</span>
                    </div>
                    
                    {/* GFR Result */}
                    {(() => {
                      const gfr = calculateGFR();
                      if (gfr !== null) {
                        let statusColor = 'text-green-600';
                        let statusBg = 'bg-green-50';
                        let statusText = 'Normal';
                        
                        if (gfr < 15) {
                          statusColor = 'text-red-600';
                          statusBg = 'bg-red-50';
                          statusText = 'Stage 5 CKD (Kidney Failure)';
                        } else if (gfr < 30) {
                          statusColor = 'text-orange-600';
                          statusBg = 'bg-orange-50';
                          statusText = 'Stage 4 CKD (Severe)';
                        } else if (gfr < 60) {
                          statusColor = 'text-amber-600';
                          statusBg = 'bg-amber-50';
                          statusText = 'Stage 3 CKD (Moderate)';
                        } else if (gfr < 90) {
                          statusColor = 'text-yellow-600';
                          statusBg = 'bg-yellow-50';
                          statusText = 'Stage 2 CKD (Mild)';
                        }
                        
                        return (
                          <div className={`p-2 ${statusBg} rounded border border-current ${statusColor}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">
                                eGFR: {gfr} mL/min/1.73m²
                              </span>
                              <span className="text-xs font-medium">
                                {statusText}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Antibiotics */}
                <div className="mb-3">
                  <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-1 text-xs">
                    💊 Antibiotics
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p><strong>Vancomycin:</strong> 15-20 mg/kg → <span className="text-primary-600 font-mono">{calcDose(15, 20)}</span> • <span className="text-amber-600">⚠️ CKD: Adjust per levels</span></p>
                    <p><strong>Ceftriaxone:</strong> 50-100 mg/kg/day → <span className="text-primary-600 font-mono">{calcDose(50, 100)}/day</span> (max 2g/day)</p>
                    <p><strong>Cefepime:</strong> 50 mg/kg → <span className="text-primary-600 font-mono">{calcDose(50)}/day</span> • <span className="text-amber-600">⚠️ CKD: q24h if CrCl &lt;30</span></p>
                    <p><strong>Meropenem:</strong> 20-40 mg/kg → <span className="text-primary-600 font-mono">{calcDose(20, 40)}</span> • <span className="text-amber-600">⚠️ CKD: Reduce dose/frequency</span></p>
                    <p><strong>Pip-Tazo:</strong> 80-100 mg/kg → <span className="text-primary-600 font-mono">{calcDose(80, 100)}</span> • <span className="text-amber-600">⚠️ CKD: 2.25g q8h</span></p>
                    <p><strong>Gentamicin:</strong> 5-7 mg/kg → <span className="text-primary-600 font-mono">{calcDose(5, 7)}</span> • <span className="text-red-600">⚠️ CKD: Monitor levels, extend interval</span></p>
                    <p><strong>Metronidazole:</strong> 7.5 mg/kg → <span className="text-primary-600 font-mono">{calcDose(7.5)}</span></p>
                    <p><strong>Azithromycin:</strong> 10 mg/kg day 1 → <span className="text-primary-600 font-mono">{calcDose(10)}</span>, then 5 mg/kg</p>
                  </div>
                </div>

                {/* Critical Care Drugs */}
                <div className="mb-3">
                  <h4 className="font-bold text-red-900 mb-2 flex items-center gap-1 text-xs">
                    🚨 Critical Care / ICU
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p><strong>Norepinephrine:</strong> 0.05-0.5 mcg/kg/min IV infusion → <span className="text-primary-600 font-mono">Start {calcDose(0.05, 0.5, 'mcg')}/min</span></p>
                    <p><strong>Dobutamine:</strong> 2.5-10 mcg/kg/min IV infusion → <span className="text-primary-600 font-mono">{calcDose(2.5, 10, 'mcg')}/min</span></p>
                    <p><strong>Nitroglycerin (GTN):</strong> 5-200 mcg/min IV infusion → <span className="text-primary-600 font-mono">Start 5-10 mcg/min</span></p>
                    <p><strong>Propofol:</strong> 1-2 mg/kg bolus → <span className="text-primary-600 font-mono">{calcDose(1, 2)}</span>, then 25-75 mcg/kg/min</p>
                    <p><strong>Phenytoin:</strong> 15-20 mg/kg loading → <span className="text-primary-600 font-mono">{calcDose(15, 20)}</span> • <span className="text-amber-600">⚠️ Max 50 mg/min</span></p>
                    <p><strong>Insulin:</strong><span className="text-amber-600"> ⚠️ CKD: Risk of hypoglycemia</span></p>
                    <p><strong>Heparin:</strong> 80 units/kg bolus → <span className="text-primary-600 font-mono">{calcDose(80, undefined, 'units')}</span>, then 18 units/kg/hr</p>
                    <p><strong>Dopamine:</strong> 2-20 mcg/kg/min IV infusion → <span className="text-primary-600 font-mono">{calcDose(2, 20, 'mcg')}/min</span></p>
                  </div>
                </div>

                {/* Other Common */}
                <div className="mb-3">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-1 text-xs">
                    💊 Other Common
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p><strong>Acetaminophen:</strong> 15 mg/kg → <span className="text-primary-600 font-mono">{calcDose(15)}</span> (max 1g q6h)</p>
                    <p><strong>Ondansetron:</strong> 0.15 mg/kg → <span className="text-primary-600 font-mono">{calcDose(0.15)}</span> (max 16mg)</p>
                    <p><strong>Hydrocortisone:</strong> 1-2 mg/kg → <span className="text-primary-600 font-mono">{calcDose(1, 2)}</span> q6-8h</p>
                    <p><strong>Furosemide:</strong> 0.5-1 mg/kg → <span className="text-primary-600 font-mono">{calcDose(0.5, 1)}</span> IV • <span className="text-amber-600">⚠️ Monitor K+</span></p>
                  </div>
                </div>

                {/* CKD Notes */}
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded">
                  <h4 className="font-bold text-amber-900 mb-1.5 flex items-center gap-1 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    CKD Dose Adjustments
                  </h4>
                  <ul className="space-y-0.5 text-xs text-amber-900">
                    <li>• <strong>CrCl &lt;50:</strong> Reduce dose for renally cleared drugs</li>
                    <li>• <strong>CrCl &lt;30:</strong> Often 50% dose or extended intervals</li>
                    <li>• <strong>Dialysis:</strong> Dose after dialysis session</li>
                    <li>• <strong>Monitor closely:</strong> Vancomycin, aminoglycosides, insulin (hypoglycemia risk)</li>
                    <li>• <strong>No adjustment:</strong> Most pressors (Norepi, dobutamine)</li>
                  </ul>
                </div>
              </div>
              );
            })()}
          </div>

          {/* Drug Interactions Cheat Sheet */}
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInteractions(!showInteractions)}
              className="w-full p-2.5 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold text-red-900">
                  ⚠️ Common Drug Interactions
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-red-600 transition-transform ${showInteractions ? 'rotate-180' : ''}`} />
            </button>
            
            {showInteractions && (
              <div className="p-3 bg-white max-h-72 overflow-y-auto text-xs">
                
                {/* Anticoagulants */}
                <div className="mb-3">
                  <h4 className="font-bold text-red-900 mb-2 flex items-center gap-1 text-xs">
                    🩸 Anticoagulants / Antiplatelets
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p className="bg-red-50 p-1.5 rounded"><strong>Warfarin + NSAIDs:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Increased bleeding risk <span className="text-blue-600 text-[10px]">(PD: GI effects)</span></p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Warfarin + Azole antifungals:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → ↑INR, bleeding <span className="text-blue-600 text-[10px]">(🚫 CYP inhibition)</span></p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Warfarin + Macrolides:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → ↑INR <span className="text-blue-600 text-[10px]">(🚫 CYP inhibition)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Aspirin + Clopidogrel:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Monitor bleeding (often intentional DAPT)</p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>DOACs + NSAIDs:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Increased bleeding</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Warfarin + Rifampin:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↓INR <span className="text-blue-600 text-[10px]">(⚡ CYP induction)</span></p>
                  </div>
                </div>

                {/* Antibiotics */}
                <div className="mb-3">
                  <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-1 text-xs">
                    💊 Antibiotics
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p className="bg-red-50 p-1.5 rounded"><strong>Fluoroquinolones + Corticosteroids:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Tendon rupture (esp. elderly)</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Macrolides + Statins:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Rhabdomyolysis <span className="text-blue-600 text-[10px]">(🚫 CYP3A4 inhibition)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Rifampin + Oral contraceptives:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↓Contraceptive efficacy <span className="text-blue-600 text-[10px]">(⚡ CYP induction)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Rifampin + Warfarin/Statins:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↓Effect <span className="text-blue-600 text-[10px]">(⚡ CYP induction)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Metronidazole + Alcohol:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Disulfiram reaction</p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Linezolid + SSRIs:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Serotonin syndrome <span className="text-blue-600 text-[10px]">(MAO inhibition)</span></p>
                  </div>
                </div>

                {/* Cardiovascular */}
                <div className="mb-3">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-1 text-xs">
                    ❤️ Cardiovascular
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p className="bg-red-50 p-1.5 rounded"><strong>ACE-I + Spironolactone:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Hyperkalemia (monitor K+)</p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Beta-blockers + Verapamil/Diltiazem:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Bradycardia, heart block</p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Digoxin + IV Calcium:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Arrhythmias, "stone heart" <span className="text-blue-600 text-[10px]">(PD: ↑Ca++ sensitivity)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Digoxin + Loop diuretics:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Hypokalemia/Mg → ↑digoxin toxicity</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Digoxin + Verapamil/Amiodarone:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↑Digoxin levels <span className="text-blue-600 text-[10px]">(P-gp inhibition)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Statins + Fibrates:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Myopathy/rhabdomyolysis</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>ACE-I + NSAIDs:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↓Efficacy, renal impairment</p>
                  </div>
                </div>

                {/* Antiepileptic Drugs */}
                <div className="mb-3">
                  <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-1 text-xs">
                    ⚡ Antiepileptic Drugs (AEDs)
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p className="bg-red-50 p-1.5 rounded"><strong>Carbamazepine + Oral contraceptives:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Contraceptive failure <span className="text-blue-600 text-[10px]">(⚡ CYP3A4 induction)</span></p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Phenytoin + Warfarin:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Unpredictable INR <span className="text-blue-600 text-[10px]">(⚡ CYP induction + protein binding)</span></p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Valproate + Carbapenems:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → ↓Valproate levels, seizures <span className="text-blue-600 text-[10px]">(Avoid combination)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Carbamazepine + Macrolides:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↑CBZ toxicity <span className="text-blue-600 text-[10px]">(🚫 CYP3A4 inhibition)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Phenytoin + Fluconazole:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↑Phenytoin toxicity <span className="text-blue-600 text-[10px]">(🚫 CYP2C9 inhibition)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Lamotrigine + Valproate:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↑Lamotrigine levels (↓dose 50%) <span className="text-blue-600 text-[10px]">(🚫 UGT inhibition)</span></p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Phenytoin/Carbamazepine + most drugs:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↓Other drug levels <span className="text-blue-600 text-[10px]">(⚡ Strong CYP inducers)</span></p>
                  </div>
                </div>

                {/* CNS / Psych */}
                <div className="mb-3">
                  <h4 className="font-bold text-pink-900 mb-2 flex items-center gap-1 text-xs">
                    🧠 CNS / Psychiatric
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p className="bg-red-50 p-1.5 rounded"><strong>Benzodiazepines + Opioids:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Respiratory depression, death</p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>MAOIs + SSRIs:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Serotonin syndrome (contraindicated)</p>
                    <p className="bg-red-50 p-1.5 rounded"><strong>Tramadol + SSRIs:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Serotonin syndrome</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>SSRIs + NSAIDs:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → ↑GI bleeding risk</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Alcohol + CNS depressants:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Additive sedation</p>
                  </div>
                </div>

                {/* Electrolytes / Metabolic */}
                <div className="mb-3">
                  <h4 className="font-bold text-green-900 mb-2 flex items-center gap-1 text-xs">
                    ⚡ Electrolytes / Metabolic
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p className="bg-red-50 p-1.5 rounded"><strong>K+ supplements + ACE-I/ARB:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Hyperkalemia</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Thiazides + Lithium:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Lithium toxicity</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Insulin + Beta-blockers:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Masks hypoglycemia symptoms</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>Loop diuretics + Aminoglycosides:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Ototoxicity, nephrotoxicity</p>
                  </div>
                </div>

                {/* QT Prolongation */}
                <div className="mb-3">
                  <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-1 text-xs">
                    📊 QT Prolongation Risk
                  </h4>
                  <div className="space-y-1.5 text-surface-700">
                    <p className="bg-red-50 p-1.5 rounded"><strong>Multiple QT-prolonging drugs:</strong> <span className="text-red-700">⚠️ HIGH RISK</span> → Torsades de pointes</p>
                    <p className="text-xs text-surface-600 italic pl-2">Common culprits: Azithromycin, Fluoroquinolones, Ondansetron, Antipsychotics, Methadone</p>
                    <p className="bg-amber-50 p-1.5 rounded"><strong>QT drugs + Hypokalemia/Mg:</strong> <span className="text-amber-700">⚠️ MODERATE</span> → Increased risk</p>
                  </div>
                </div>

                {/* Mechanism Legend */}
                <div className="mb-3 p-2.5 bg-blue-50 border border-blue-300 rounded">
                  <h4 className="font-bold text-blue-900 mb-1.5 flex items-center gap-1 text-xs">
                    🔬 Mechanism Key
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-blue-900">
                    <p><strong>⚡ CYP Induction:</strong> Speeds up metabolism → ↓Drug levels</p>
                    <p><strong>🚫 CYP Inhibition:</strong> Slows metabolism → ↑Drug levels</p>
                    <p><strong>PD:</strong> Pharmacodynamic (direct effect)</p>
                    <p><strong>P-gp:</strong> P-glycoprotein transporter</p>
                  </div>
                  <p className="mt-1.5 text-[10px] text-blue-800"><strong>Strong CYP Inducers:</strong> Rifampin, Phenytoin, Carbamazepine, Phenobarbital</p>
                  <p className="text-[10px] text-blue-800"><strong>Strong CYP Inhibitors:</strong> Azoles, Macrolides, Ritonavir, Grapefruit juice</p>
                </div>

                {/* General Notes */}
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded">
                  <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1 text-xs">
                    📝 Key Points
                  </h4>
                  <ul className="space-y-0.5 text-xs text-slate-900">
                    <li>• Always check drug interactions before prescribing</li>
                    <li>• Consider patient's complete medication list including OTC</li>
                    <li>• High-risk patients: Elderly, polypharmacy, renal/hepatic impairment</li>
                    <li>• Monitor for interaction symptoms when starting new medications</li>
                    <li>• Document rationale if prescribing known interacting drugs</li>
                    <li>• <strong>Enzyme inducers:</strong> Effects take days-weeks to develop/resolve</li>
                    <li>• <strong>Enzyme inhibitors:</strong> Effects often occur within days</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setIsMedModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" loading={isAddingMed}>
              Add / Save Medication
            </Button>
          </div>
        </form>
      </Modal>

      {/* File Viewer Modal */}
      <Modal
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        title={viewingFile?.fileName || "File"}
        size="xl"
      >
        {viewingFile && (
          <div className="space-y-4">
            {viewingFile.fileType.startsWith("image/") ? (
              <img
                src={viewingFile.fileUrl}
                alt={viewingFile.fileName}
                className="w-full rounded-lg"
              />
            ) : (
              <div className="p-8 text-center bg-surface-50 rounded-lg">
                <Paperclip className="w-12 h-12 text-surface-400 mx-auto mb-3" />
                <p className="text-surface-600">{viewingFile.fileName}</p>
                <a
                  href={viewingFile.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline text-sm mt-2 inline-block"
                >
                  Open in new tab
                </a>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  handleDeleteFile(viewingFile);
                  setViewingFile(null);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <a
                href={viewingFile.fileUrl}
                download={viewingFile.fileName}
                className="btn btn-secondary text-sm"
              >
                Download
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
