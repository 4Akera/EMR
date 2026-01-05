"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Patient, Profile, PatientUpdate } from "@/lib/types/database";
import { formatDate, getSexLabel, calculateAge } from "@/lib/utils";
import { Button, Input, Card, Modal, EmptyState } from "@/components/ui";
import { PatientForm } from "@/components/patients/PatientForm";
import {
  Search,
  Plus,
  Users,
  ChevronRight,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Calendar,
  Phone,
  Hash,
} from "lucide-react";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const router = useRouter();
  const supabase = createClient();

  // Helper to get user display name
  const getUserName = (userId: string | null | undefined): string => {
    if (!userId) return "";
    const profile = profiles[userId];
    return profile?.displayName || "";
  };

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);

    // Fetch profiles first
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

    // Fetch patients
    let query = supabase
      .from("patients")
      .select("*")
      .order("updatedAt", { ascending: false });

    if (!showDeleted) {
      query = query.is("deletedAt", null);
    }

    if (searchQuery.trim()) {
      query = query.ilike("fullName", `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching patients:", error);
    } else {
      setPatients((data as Patient[]) || []);
    }
    setIsLoading(false);
  }, [supabase, searchQuery, showDeleted]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSoftDelete = async (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${patient.fullName}?`)) return;

    // @ts-ignore - Supabase type inference issue
    const { error } = await supabase
      .from("patients")
      .update({ deletedAt: new Date().toISOString() })
      .eq("id", patient.id);

    if (error) {
      console.error("Error deleting patient:", error);
    } else {
      fetchPatients();
    }
  };

  const handleRestore = async (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    // @ts-ignore - Supabase type inference issue
    const { error } = await supabase
      .from("patients")
      .update({ deletedAt: null })
      .eq("id", patient.id);

    if (error) {
      console.error("Error restoring patient:", error);
    } else {
      fetchPatients();
    }
  };

  const handlePatientSaved = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
    fetchPatients();
  };

  const openCreateModal = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const openEditModal = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-surface-900">Patients</h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage patient records and encounters
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Patient
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <div className="p-3 md:p-4 border-b border-surface-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showDeleted ? "primary" : "secondary"}
              onClick={() => setShowDeleted(!showDeleted)}
              className="w-full sm:w-auto"
            >
              {showDeleted ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span className="sm:inline">{showDeleted ? "Hide Deleted" : "Show Deleted"}</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="mt-2 text-surface-500">Loading patients...</p>
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients found"
            description={
              searchQuery
                ? "Try adjusting your search query"
                : "Get started by adding your first patient"
            }
            action={
              !searchQuery && (
                <Button onClick={openCreateModal}>
                  <Plus className="w-4 h-4" />
                  Add Patient
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-surface-100">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  className={`p-4 active:bg-surface-100 cursor-pointer ${
                    patient.deletedAt ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-surface-900 truncate">
                          {patient.fullName}
                        </h3>
                        {patient.deletedAt && (
                          <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                            deleted
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-surface-500">
                        {patient.birthDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {calculateAge(patient.birthDate)} • {getSexLabel(patient.sex)}
                          </span>
                        )}
                        {patient.mrn && (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {patient.mrn}
                          </span>
                        )}
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </span>
                        )}
                        {getUserName(patient.createdBy) && (
                          <span className="flex items-center gap-1 text-primary-600">
                            <Users className="w-3 h-3" />
                            {getUserName(patient.createdBy)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {patient.deletedAt ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleRestore(patient, e)}
                          className="!p-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openEditModal(patient, e)}
                            className="!p-2"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleSoftDelete(patient, e)}
                            className="!p-2 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <ChevronRight className="w-5 h-5 text-surface-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="table-header">Name</th>
                    <th className="table-header">DOB</th>
                    <th className="table-header">Sex</th>
                    <th className="table-header">MRN</th>
                    <th className="table-header">Created By</th>
                    <th className="table-header">Last Updated</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className={`hover:bg-surface-50 cursor-pointer ${
                        patient.deletedAt ? "opacity-60" : ""
                      }`}
                      onClick={() => router.push(`/patients/${patient.id}`)}
                    >
                      <td className="table-cell">
                        <span className="font-medium text-surface-900">
                          {patient.fullName}
                        </span>
                        {patient.deletedAt && (
                          <span className="ml-2 text-xs text-red-500">(deleted)</span>
                        )}
                      </td>
                      <td className="table-cell text-surface-600">
                        {formatDate(patient.birthDate)}
                      </td>
                      <td className="table-cell text-surface-600">
                        {getSexLabel(patient.sex)}
                      </td>
                      <td className="table-cell">
                        {patient.mrn ? (
                          <span className="font-mono text-sm bg-surface-100 px-2 py-0.5 rounded">
                            {patient.mrn}
                          </span>
                        ) : (
                          <span className="text-surface-400">—</span>
                        )}
                      </td>
                      <td className="table-cell text-surface-600 text-sm">
                        {getUserName(patient.createdBy) || <span className="text-surface-400">—</span>}
                      </td>
                      <td className="table-cell text-surface-500 text-sm">
                        {formatDate(patient.updatedAt)}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openEditModal(patient, e)}
                          >
                            Edit
                          </Button>
                          {patient.deletedAt ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleRestore(patient, e)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleSoftDelete(patient, e)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/patients/${patient.id}`)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPatient(null);
        }}
        title={editingPatient ? "Edit Patient" : "Add New Patient"}
      >
        <PatientForm
          patient={editingPatient}
          onSaved={handlePatientSaved}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingPatient(null);
          }}
        />
      </Modal>
    </div>
  );
}
