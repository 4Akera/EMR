"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Patient,
  PatientDetails,
  Encounter,
} from "@/lib/types/database";
import { formatDate, formatDateTime, getSexLabel, calculateAge } from "@/lib/utils";
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
  User,
  FileText,
  Calendar,
  Phone,
  Hash,
  Plus,
  Activity,
  MapPin,
  ChevronRight,
  Save,
} from "lucide-react";

const SEX_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "U", label: "Unknown" },
];

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;
  const supabase = createClient();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDemographics, setIsSavingDemographics] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false);
  const [isCreatingEncounter, setIsCreatingEncounter] = useState(false);

  const [demographicsForm, setDemographicsForm] = useState({
    fullName: "",
    birthDate: "",
    sex: "",
    mrn: "",
    phone: "",
  });

  const [detailsForm, setDetailsForm] = useState({
    weight: "",
    pmh: "",
    psh: "",
    currentMeds: "",
    allergies: "",
    familyHx: "",
    socialHx: "",
  });

  const [newEncounter, setNewEncounter] = useState({
    currentLocation: "",
    cc: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Fetch patient
    const { data: patientData } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (patientData) {
      const p = patientData as Patient;
      setPatient(p);
      setDemographicsForm({
        fullName: p.fullName || "",
        birthDate: p.birthDate
          ? new Date(p.birthDate).toISOString().split("T")[0]
          : "",
        sex: p.sex || "",
        mrn: p.mrn || "",
        phone: p.phone || "",
      });
    }

    // Fetch patient details
    const { data: detailsData } = await supabase
      .from("patient_details")
      .select("*")
      .eq("patientId", patientId)
      .is("deletedAt", null)
      .single();

    if (detailsData) {
      const d = detailsData as PatientDetails;
      setPatientDetails(d);
      setDetailsForm({
        weight: d.weight?.toString() || "",
        pmh: d.pmh || "",
        psh: d.psh || "",
        currentMeds: d.currentMeds || "",
        allergies: d.allergies || "",
        familyHx: d.familyHx || "",
        socialHx: d.socialHx || "",
      });
    }

    // Fetch encounters
    const { data: encountersData } = await supabase
      .from("encounters")
      .select("*")
      .eq("patientId", patientId)
      .is("deletedAt", null)
      .order("startAt", { ascending: false });

    if (encountersData) {
      setEncounters(encountersData as Encounter[]);
    }

    setIsLoading(false);
  }, [supabase, patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveDemographics = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDemographics(true);

    await supabase
      .from("patients")
      .update({
        fullName: demographicsForm.fullName.trim(),
        birthDate: demographicsForm.birthDate || null,
        sex: demographicsForm.sex || null,
        mrn: demographicsForm.mrn.trim() || null,
        phone: demographicsForm.phone.trim() || null,
      } as never)
      .eq("id", patientId);

    fetchData();
    setIsSavingDemographics(false);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);

    const detailsData = {
      patientId,
      weight: detailsForm.weight ? parseFloat(detailsForm.weight) : null,
      pmh: detailsForm.pmh.trim() || null,
      psh: detailsForm.psh.trim() || null,
      currentMeds: detailsForm.currentMeds.trim() || null,
      allergies: detailsForm.allergies.trim() || null,
      familyHx: detailsForm.familyHx.trim() || null,
      socialHx: detailsForm.socialHx.trim() || null,
    };

    if (patientDetails) {
      await supabase
        .from("patient_details")
        .update(detailsData as never)
        .eq("id", patientDetails.id);
    } else {
      await supabase.from("patient_details").insert(detailsData as never);
    }

    fetchData();
    setIsSavingDetails(false);
  };

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingEncounter(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("encounters")
      .insert({
        patientId,
        status: "ACTIVE",
        currentLocation: newEncounter.currentLocation.trim() || null,
        cc: newEncounter.cc.trim() || null,
        createdBy: user?.id || null,
      } as never)
      .select()
      .single();

    if (!error && data) {
      router.push(`/encounters/${(data as Encounter).id}`);
    }

    setIsCreatingEncounter(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <EmptyState
        icon={User}
        title="Patient not found"
        description="The patient you're looking for doesn't exist or has been removed."
        action={
          <Button onClick={() => router.push("/patients")}>
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/patients")}
            className="-ml-2 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-surface-900 truncate">
              {patient.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-surface-500 mt-1">
              {patient.mrn && (
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3 md:w-4 md:h-4" />
                  {patient.mrn}
                </span>
              )}
              {patient.birthDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                  {formatDate(patient.birthDate)} ({calculateAge(patient.birthDate)})
                </span>
              )}
              {patient.sex && (
                <span>{getSexLabel(patient.sex)}</span>
              )}
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 md:w-4 md:h-4" />
                  {patient.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action - New Encounter (Mobile) */}
        <Button
          onClick={() => setIsEncounterModalOpen(true)}
          className="md:hidden w-full"
        >
          <Plus className="w-4 h-4" />
          New Encounter
        </Button>
      </div>

      {/* Encounters Section - Mobile First */}
      <div className="md:hidden">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="section-title">
                <Activity className="w-5 h-5 text-primary-600" />
                Encounters
              </h2>
              <span className="text-xs text-surface-500">
                {encounters.length} total
              </span>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {encounters.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-surface-500 text-sm">No encounters yet</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100">
                {encounters.slice(0, 3).map((encounter) => (
                  <button
                    key={encounter.id}
                    onClick={() => router.push(`/encounters/${encounter.id}`)}
                    className="w-full p-4 text-left active:bg-surface-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getStatusVariant(encounter.status)}>
                            {encounter.status}
                          </Badge>
                          {encounter.currentLocation && (
                            <span className="flex items-center gap-1 text-xs text-surface-500">
                              <MapPin className="w-3 h-3" />
                              {encounter.currentLocation}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-500">
                          {formatDateTime(encounter.startAt)}
                        </p>
                        {encounter.primaryDx && (
                          <p className="text-sm text-surface-900 font-medium mt-1 truncate">
                            {encounter.primaryDx}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-surface-400 flex-shrink-0" />
                    </div>
                  </button>
                ))}
                {encounters.length > 3 && (
                  <div className="p-3 text-center">
                    <span className="text-xs text-surface-500">
                      +{encounters.length - 3} more encounters
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Demographics & Details */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Demographics */}
          <Card>
            <CardHeader>
              <h2 className="section-title">
                <User className="w-5 h-5 text-primary-600" />
                Demographics
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSaveDemographics} className="space-y-4">
                <Input
                  label="Full Name"
                  value={demographicsForm.fullName}
                  onChange={(e) =>
                    setDemographicsForm({
                      ...demographicsForm,
                      fullName: e.target.value,
                    })
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={demographicsForm.birthDate}
                    onChange={(e) =>
                      setDemographicsForm({
                        ...demographicsForm,
                        birthDate: e.target.value,
                      })
                    }
                  />
                  <Select
                    label="Sex"
                    value={demographicsForm.sex}
                    onChange={(e) =>
                      setDemographicsForm({
                        ...demographicsForm,
                        sex: e.target.value,
                      })
                    }
                    options={SEX_OPTIONS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="MRN"
                    value={demographicsForm.mrn}
                    onChange={(e) =>
                      setDemographicsForm({
                        ...demographicsForm,
                        mrn: e.target.value,
                      })
                    }
                    placeholder="Medical Record Number"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={demographicsForm.phone}
                    onChange={(e) =>
                      setDemographicsForm({
                        ...demographicsForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="Contact number"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" loading={isSavingDemographics}>
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Save Demographics</span>
                    <span className="sm:hidden">Save</span>
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Patient Details */}
          <Card>
            <CardHeader>
              <h2 className="section-title">
                <FileText className="w-5 h-5 text-primary-600" />
                Patient History
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Textarea
                    label="Past Medical History"
                    value={detailsForm.pmh}
                    onChange={(e) =>
                      setDetailsForm({ ...detailsForm, pmh: e.target.value })
                    }
                    rows={3}
                    placeholder="DM2, HTN, CAD..."
                  />
                  <Textarea
                    label="Past Surgical History"
                    value={detailsForm.psh}
                    onChange={(e) =>
                      setDetailsForm({ ...detailsForm, psh: e.target.value })
                    }
                    rows={3}
                    placeholder="Appendectomy 2015..."
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Textarea
                    label="Home Medications"
                    value={detailsForm.currentMeds}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        currentMeds: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Metformin 1g BD..."
                  />
                  <Textarea
                    label="Allergies"
                    value={detailsForm.allergies}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        allergies: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Penicillin - rash..."
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Textarea
                    label="Family History"
                    value={detailsForm.familyHx}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        familyHx: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Father - MI at 55..."
                  />
                  <Textarea
                    label="Social History"
                    value={detailsForm.socialHx}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        socialHx: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Non-smoker, occasional alcohol..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" loading={isSavingDetails}>
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Save History</span>
                    <span className="sm:hidden">Save</span>
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right Column - Encounters (Desktop) */}
        <div className="hidden md:block space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="section-title">
                  <Activity className="w-5 h-5 text-primary-600" />
                  Encounters
                </h2>
                <Button
                  size="sm"
                  onClick={() => setIsEncounterModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {encounters.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-surface-500 text-sm">No encounters yet</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {encounters.map((encounter) => (
                    <button
                      key={encounter.id}
                      onClick={() => router.push(`/encounters/${encounter.id}`)}
                      className="w-full p-4 text-left hover:bg-surface-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getStatusVariant(encounter.status)}>
                              {encounter.status}
                            </Badge>
                            {encounter.currentLocation && (
                              <span className="flex items-center gap-1 text-xs text-surface-500">
                                <MapPin className="w-3 h-3" />
                                {encounter.currentLocation}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-surface-600">
                            {formatDateTime(encounter.startAt)}
                          </p>
                          {encounter.primaryDx && (
                            <p className="text-sm text-surface-900 font-medium mt-1 truncate">
                              {encounter.primaryDx}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-surface-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Contact Info Quick View */}
          {patient.phone && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Contact</p>
                    <p className="font-medium text-surface-900">{patient.phone}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* New Encounter Modal */}
      <Modal
        isOpen={isEncounterModalOpen}
        onClose={() => setIsEncounterModalOpen(false)}
        title="Create New Encounter"
      >
        <form onSubmit={handleCreateEncounter} className="space-y-4">
          <Input
            label="Location"
            value={newEncounter.currentLocation}
            onChange={(e) =>
              setNewEncounter({
                ...newEncounter,
                currentLocation: e.target.value,
              })
            }
            placeholder="ER, ICU, Ward A..."
          />
          <Textarea
            label="Chief Complaint"
            value={newEncounter.cc}
            onChange={(e) =>
              setNewEncounter({ ...newEncounter, cc: e.target.value })
            }
            rows={3}
            placeholder="Patient presents with..."
          />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setIsEncounterModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" loading={isCreatingEncounter}>
              Create Encounter
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
