"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@/lib/types/database";
import { formatDateForInput, calculateAge } from "@/lib/utils";
import { Button, Input, Select } from "@/components/ui";
import { AlertTriangle, User } from "lucide-react";

interface PatientFormProps {
  patient?: Patient | null;
  onSaved: () => void;
  onCancel: () => void;
}

const SEX_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "U", label: "Unknown" },
];

export function PatientForm({ patient, onSaved, onCancel }: PatientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: patient?.fullName || "",
    birthDate: formatDateForInput(patient?.birthDate),
    sex: patient?.sex || "",
    mrn: patient?.mrn || "",
    phone: patient?.phone || "",
  });
  const [similarPatients, setSimilarPatients] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const supabase = createClient();

  // Search for similar patients when name is typed
  const searchSimilarPatients = useCallback(async (name: string) => {
    if (!name || name.trim().length < 3) {
      setSimilarPatients([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search for patients with similar names
      const searchTerm = name.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .is("deletedAt", null)
        .ilike("fullName", `%${searchTerm}%`)
        .limit(5);

      if (error) throw error;

      // Filter out the current patient if editing
      const results = (data as Patient[]).filter(p => p.id !== patient?.id);
      setSimilarPatients(results);
    } catch (err) {
      console.error("Error searching patients:", err);
    } finally {
      setIsSearching(false);
    }
  }, [patient?.id, supabase]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSimilarPatients(formData.fullName);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [formData.fullName, searchSimilarPatients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const data = {
        fullName: formData.fullName.trim(),
        birthDate: formData.birthDate || null,
        sex: formData.sex || null,
        mrn: formData.mrn.trim() || null,
        phone: formData.phone.trim() || null,
      };

      if (patient) {
        const { error } = await supabase
          .from("patients")
          .update({ ...data, updatedBy: user?.id } as never)
          .eq("id", patient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("patients")
          .insert({ ...data, createdBy: user?.id } as never);
        if (error) throw error;
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          required
          placeholder="Enter patient's full name"
        />
        
        {/* Duplicate warning */}
        {isSearching && formData.fullName.length >= 3 && (
          <div className="mt-2 text-xs text-surface-500 flex items-center gap-1">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
            Checking for duplicates...
          </div>
        )}
        
        {!isSearching && similarPatients.length > 0 && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900">
                  Similar patients found ({similarPatients.length})
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Please verify this is not a duplicate
                </p>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {similarPatients.map((similar) => (
                <div
                  key={similar.id}
                  className="flex items-center gap-2 p-2 bg-white rounded border border-amber-200 text-xs"
                >
                  <User className="w-3 h-3 text-surface-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-900 truncate">
                      {similar.fullName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-surface-500 mt-0.5">
                      {similar.birthDate && (
                        <span>{calculateAge(similar.birthDate)}</span>
                      )}
                      {similar.sex && (
                        <>
                          <span>•</span>
                          <span>{similar.sex === 'M' ? 'Male' : similar.sex === 'F' ? 'Female' : 'Unknown'}</span>
                        </>
                      )}
                      {similar.mrn && (
                        <>
                          <span>•</span>
                          <span className="font-mono">MRN: {similar.mrn}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Input
          label="Date of Birth"
          name="birthDate"
          type="date"
          value={formData.birthDate}
          onChange={(e) =>
            setFormData({ ...formData, birthDate: e.target.value })
          }
        />

        <Select
          label="Sex"
          name="sex"
          value={formData.sex}
          onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
          options={SEX_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Input
          label="MRN"
          name="mrn"
          value={formData.mrn}
          onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
          placeholder="Medical Record #"
        />

        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Contact number"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" loading={isLoading} className="w-full sm:w-auto">
          {patient ? "Save Changes" : "Add Patient"}
        </Button>
      </div>
    </form>
  );
}
