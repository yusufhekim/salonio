import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  updateDoc,
  where,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Appointment } from "@domain/appointment";

const COLLECTION = "appointments";

export type AppointmentCreate = Omit<Appointment, "id">;

function docToAppointment(id: string, data: Record<string, unknown>): Appointment {
  return {
    id,
    customerId: (data.customerId as string) ?? "",
    barberId: (data.barberId as string) ?? "",
    barberName: (data.barberName as string) | undefined,
    date: (data.date as string) ?? "",
    timeSlot: (data.timeSlot as string) ?? "",
    status: (data.status as Appointment["status"]) ?? "booked",
  };
}

/**
 * Creates a new appointment in Firestore. Returns the new document id.
 */
export async function createAppointment(
  data: AppointmentCreate
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    customerId: data.customerId,
    barberId: data.barberId,
    barberName: data.barberName ?? null,
    date: data.date,
    timeSlot: data.timeSlot,
    status: data.status,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/**
 * Fetches all appointments for a customer (by customerId). Sorted by date desc, then timeSlot.
 * Uses where-only query to avoid requiring a composite index in Firestore.
 */
export async function getAppointmentsByCustomer(
  customerId: string
): Promise<Appointment[]> {
  const q = query(
    collection(db, COLLECTION),
    where("customerId", "==", customerId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) =>
    docToAppointment(d.id, d.data() as Record<string, unknown>)
  );
  return list.sort((a, b) => {
    if (b.date !== a.date) return b.date > a.date ? 1 : -1;
    return a.timeSlot < b.timeSlot ? -1 : 1;
  });
}

/**
 * Fetches all appointments for a barber (by barberId). Sorted by date desc, then timeSlot.
 * Uses where-only query to avoid requiring a composite index in Firestore.
 */
export async function getAppointmentsByBarber(
  barberId: string
): Promise<Appointment[]> {
  const q = query(
    collection(db, COLLECTION),
    where("barberId", "==", barberId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) =>
    docToAppointment(d.id, d.data() as Record<string, unknown>)
  );
  return list.sort((a, b) => {
    if (b.date !== a.date) return b.date > a.date ? 1 : -1;
    return a.timeSlot < b.timeSlot ? -1 : 1;
  });
}

/**
 * Updates appointment status to 'cancelled' in Firestore.
 */
export async function cancelAppointmentInFirestore(
  appointmentId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, appointmentId), { status: "cancelled" });
}

/**
 * Permanently deletes an appointment document from Firestore.
 * Use for removing cancelled appointments from the list.
 */
export async function deleteAppointmentFromFirestore(
  appointmentId: string
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, appointmentId));
}
