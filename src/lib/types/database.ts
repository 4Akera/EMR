export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          displayName: string;
          email: string | null;
          role: "ADMIN" | "DOCTOR" | "NURSE" | "STAFF";
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          displayName: string;
          email?: string | null;
          role?: "ADMIN" | "DOCTOR" | "NURSE" | "STAFF";
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          displayName?: string;
          email?: string | null;
          role?: "ADMIN" | "DOCTOR" | "NURSE" | "STAFF";
          createdAt?: string;
          updatedAt?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          fullName: string;
          birthDate: string | null;
          sex: "M" | "F" | "U" | null;
          mrn: string | null;
          phone: string | null;
          createdBy: string | null;
          updatedBy: string | null;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          fullName: string;
          birthDate?: string | null;
          sex?: "M" | "F" | "U" | null;
          mrn?: string | null;
          phone?: string | null;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          fullName?: string;
          birthDate?: string | null;
          sex?: "M" | "F" | "U" | null;
          mrn?: string | null;
          phone?: string | null;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
      patient_details: {
        Row: {
          id: string;
          patientId: string;
          weight: number | null;
          pmh: string | null;
          psh: string | null;
          currentMeds: string | null;
          allergies: string | null;
          familyHx: string | null;
          socialHx: string | null;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          patientId: string;
          weight?: number | null;
          pmh?: string | null;
          psh?: string | null;
          currentMeds?: string | null;
          allergies?: string | null;
          familyHx?: string | null;
          socialHx?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          patientId?: string;
          weight?: number | null;
          pmh?: string | null;
          psh?: string | null;
          currentMeds?: string | null;
          allergies?: string | null;
          familyHx?: string | null;
          socialHx?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
      encounters: {
        Row: {
          id: string;
          patientId: string;
          status: "ACTIVE" | "DISCHARGED" | "DECEASED";
          startAt: string;
          endAt: string | null;
          currentLocation: string | null;
          primaryDx: string | null;
          problemListText: string | null;
          cc: string | null;
          hpi: string | null;
          ros: string | null;
          physicalExam: string | null;
          investigations: string | null;
          summary: string | null;
          dischargeNote: string | null;
          dischargeAt: string | null;
          createdBy: string | null;
          updatedBy: string | null;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          patientId: string;
          status?: "ACTIVE" | "DISCHARGED" | "DECEASED";
          startAt?: string;
          endAt?: string | null;
          currentLocation?: string | null;
          primaryDx?: string | null;
          problemListText?: string | null;
          cc?: string | null;
          hpi?: string | null;
          ros?: string | null;
          physicalExam?: string | null;
          investigations?: string | null;
          summary?: string | null;
          dischargeNote?: string | null;
          dischargeAt?: string | null;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          patientId?: string;
          status?: "ACTIVE" | "DISCHARGED" | "DECEASED";
          startAt?: string;
          endAt?: string | null;
          currentLocation?: string | null;
          primaryDx?: string | null;
          problemListText?: string | null;
          cc?: string | null;
          hpi?: string | null;
          ros?: string | null;
          physicalExam?: string | null;
          investigations?: string | null;
          summary?: string | null;
          dischargeNote?: string | null;
          dischargeAt?: string | null;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
      encounter_actions: {
        Row: {
          id: string;
          encounterId: string;
          type: string;
          text: string;
          eventAt: string;
          createdBy: string | null;
          updatedBy: string | null;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          encounterId: string;
          type: string;
          text: string;
          eventAt?: string;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          encounterId?: string;
          type?: string;
          text?: string;
          eventAt?: string;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
      encounter_medications: {
        Row: {
          id: string;
          encounterId: string;
          name: string;
          dose: string | null;
          route: string | null;
          frequency: string | null;
          indication: string | null;
          startAt: string;
          stopAt: string | null;
          status: "ACTIVE" | "STOPPED";
          notes: string | null;
          createdBy: string | null;
          updatedBy: string | null;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          encounterId: string;
          name: string;
          dose?: string | null;
          route?: string | null;
          frequency?: string | null;
          indication?: string | null;
          startAt?: string;
          stopAt?: string | null;
          status?: "ACTIVE" | "STOPPED";
          notes?: string | null;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          encounterId?: string;
          name?: string;
          dose?: string | null;
          route?: string | null;
          frequency?: string | null;
          indication?: string | null;
          startAt?: string;
          stopAt?: string | null;
          status?: "ACTIVE" | "STOPPED";
          notes?: string | null;
          createdBy?: string | null;
          updatedBy?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
      encounter_files: {
        Row: {
          id: string;
          encounterId: string;
          actionId: string | null;
          fileName: string;
          fileType: string;
          fileUrl: string;
          fileSize: number | null;
          caption: string | null;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          encounterId: string;
          actionId?: string | null;
          fileName: string;
          fileType: string;
          fileUrl: string;
          fileSize?: number | null;
          caption?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          encounterId?: string;
          actionId?: string | null;
          fileName?: string;
          fileType?: string;
          fileUrl?: string;
          fileSize?: number | null;
          caption?: string | null;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
export type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"];

export type PatientDetails = Database["public"]["Tables"]["patient_details"]["Row"];
export type PatientDetailsInsert = Database["public"]["Tables"]["patient_details"]["Insert"];
export type PatientDetailsUpdate = Database["public"]["Tables"]["patient_details"]["Update"];

export type Encounter = Database["public"]["Tables"]["encounters"]["Row"];
export type EncounterInsert = Database["public"]["Tables"]["encounters"]["Insert"];
export type EncounterUpdate = Database["public"]["Tables"]["encounters"]["Update"];

export type EncounterAction = Database["public"]["Tables"]["encounter_actions"]["Row"];
export type EncounterActionInsert = Database["public"]["Tables"]["encounter_actions"]["Insert"];
export type EncounterActionUpdate = Database["public"]["Tables"]["encounter_actions"]["Update"];

export type EncounterMedication = Database["public"]["Tables"]["encounter_medications"]["Row"];
export type EncounterMedicationInsert = Database["public"]["Tables"]["encounter_medications"]["Insert"];
export type EncounterMedicationUpdate = Database["public"]["Tables"]["encounter_medications"]["Update"];

export type EncounterFile = Database["public"]["Tables"]["encounter_files"]["Row"];
export type EncounterFileInsert = Database["public"]["Tables"]["encounter_files"]["Insert"];
export type EncounterFileUpdate = Database["public"]["Tables"]["encounter_files"]["Update"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type EncounterStatus = "ACTIVE" | "DISCHARGED" | "DECEASED";
export type MedicationStatus = "ACTIVE" | "STOPPED";
export type Sex = "M" | "F" | "U";
export type UserRole = "ADMIN" | "DOCTOR" | "NURSE" | "STAFF";
export type ActionType = "TX" | "INV" | "EXAM" | "REASONING" | "VITALS" | "NOTE" | "TRANSFER";
